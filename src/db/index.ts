import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

type SqlJsDatabase = any;

type SqlJsModule = {
    Database: new (data?: Uint8Array) => SqlJsDatabase;
};

export interface TabItemRow {
    id: string;
    group_id: string;
    label: string;
    file_uri: string;
    sort_order: number;
}

export interface TabsGroupRow {
    id: string;
    branch_name: string | null; // null means active/main state
    label: string;
    pinned: number; // 0 or 1
    tags: string; // comma-separated or JSON array
    create_time: number;
    sort_order: number;
}

export interface BranchRow {
    branch_name: string;
    updated_at: number;
}

export class SqlJsDatabaseService {
    private db!: SqlJsDatabase;
    private initialized = false;

    private readonly dbFilePath: string;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(private readonly context: vscode.ExtensionContext) {
        this.dbFilePath = path.join(context.globalStorageUri.fsPath, "onetab.sqljs.sqlite");
    }

    public async init(): Promise<void> {
        if (this.initialized) return;

        await fs.promises.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });

        const SQL: SqlJsModule = await this.loadSqlJs();
        const bytes = await this.readDbFileIfExists();

        this.db = bytes ? new SQL.Database(bytes) : new SQL.Database();
        this.initializeSchema();

        this.initialized = true;
    }

    public async close(): Promise<void> {
        if (!this.initialized) return;
        await this.flushToDisk();
        try {
            this.db?.close?.();
        } catch {
            // ignore
        }
        this.initialized = false;
    }

    // ---------- KV API (for simple state like groupCnt) ----------

    public getWorkspaceState(key: string): string | undefined {
        this.ensureReady();
        const stmt = this.db.prepare(`SELECT value FROM workspace_state WHERE key = ? LIMIT 1`);
        try {
            stmt.bind([key]);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                return row.value as string;
            }
            return undefined;
        } finally {
            stmt.free();
        }
    }

    public setWorkspaceState(key: string, value: string): Promise<void> {
        this.ensureReady();
        const now = Date.now();
        this.db.run(
            `INSERT INTO workspace_state(key, value, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
            [key, value, now]
        );
        return this.enqueueFlush();
    }

    public deleteWorkspaceState(key: string): Promise<void> {
        this.ensureReady();
        this.db.run(`DELETE FROM workspace_state WHERE key = ?`, [key]);
        return this.enqueueFlush();
    }

    public listWorkspaceKeys(): string[] {
        this.ensureReady();
        const res = this.db.exec(`SELECT key FROM workspace_state ORDER BY key`);
        const rows = res?.[0]?.values ?? [];
        return rows.map((r: any[]) => String(r[0]));
    }

    // ---------- TABS GROUPS API ----------

    public insertTabsGroup(group: TabsGroupRow): void {
        this.ensureReady();
        this.db.run(
            `INSERT OR REPLACE INTO tabs_groups(id, branch_name, label, pinned, tags, create_time, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [group.id, group.branch_name, group.label, group.pinned, group.tags, group.create_time, group.sort_order]
        );
    }

    public updateTabsGroup(group: TabsGroupRow): void {
        this.ensureReady();
        this.db.run(
            `UPDATE tabs_groups SET label = ?, pinned = ?, tags = ?, sort_order = ? WHERE id = ?`,
            [group.label, group.pinned, group.tags, group.sort_order, group.id]
        );
    }

    public deleteTabsGroup(id: string): void {
        this.ensureReady();
        this.db.run(`DELETE FROM tab_items WHERE group_id = ?`, [id]);
        this.db.run(`DELETE FROM tabs_groups WHERE id = ?`, [id]);
    }

    public getTabsGroups(branchName: string | null): TabsGroupRow[] {
        this.ensureReady();
        const sql = branchName === null
            ? `SELECT * FROM tabs_groups WHERE branch_name IS NULL ORDER BY sort_order, create_time DESC`
            : `SELECT * FROM tabs_groups WHERE branch_name = ? ORDER BY sort_order, create_time DESC`;
        const res = this.db.exec(sql, branchName === null ? [] : [branchName]);
        if (!res[0]) return [];
        return this.rowsToObjects<TabsGroupRow>(res[0]);
    }

    public getTabsGroupById(id: string): TabsGroupRow | undefined {
        this.ensureReady();
        const res = this.db.exec(`SELECT * FROM tabs_groups WHERE id = ? LIMIT 1`, [id]);
        if (!res[0] || !res[0].values.length) return undefined;
        return this.rowsToObjects<TabsGroupRow>(res[0])[0];
    }

    public clearTabsGroups(branchName: string | null): void {
        this.ensureReady();
        if (branchName === null) {
            // Get all group IDs for the main state
            const res = this.db.exec(`SELECT id FROM tabs_groups WHERE branch_name IS NULL`);
            const ids = res?.[0]?.values?.map((r: any[]) => r[0]) ?? [];
            for (const id of ids) {
                this.db.run(`DELETE FROM tab_items WHERE group_id = ?`, [id]);
            }
            this.db.run(`DELETE FROM tabs_groups WHERE branch_name IS NULL`);
        } else {
            const res = this.db.exec(`SELECT id FROM tabs_groups WHERE branch_name = ?`, [branchName]);
            const ids = res?.[0]?.values?.map((r: any[]) => r[0]) ?? [];
            for (const id of ids) {
                this.db.run(`DELETE FROM tab_items WHERE group_id = ?`, [id]);
            }
            this.db.run(`DELETE FROM tabs_groups WHERE branch_name = ?`, [branchName]);
        }
    }

    // ---------- TAB ITEMS API ----------

    public insertTabItem(item: TabItemRow): void {
        this.ensureReady();
        this.db.run(
            `INSERT OR REPLACE INTO tab_items(id, group_id, label, file_uri, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [item.id, item.group_id, item.label, item.file_uri, item.sort_order]
        );
    }

    public deleteTabItem(id: string): void {
        this.ensureReady();
        this.db.run(`DELETE FROM tab_items WHERE id = ?`, [id]);
    }

    public deleteTabItemsByGroupId(groupId: string): void {
        this.ensureReady();
        this.db.run(`DELETE FROM tab_items WHERE group_id = ?`, [groupId]);
    }

    public deleteTabItemByPath(groupId: string, fsPath: string): void {
        this.ensureReady();
        this.db.run(`DELETE FROM tab_items WHERE group_id = ? AND file_uri = ?`, [groupId, fsPath]);
    }

    public getTabItems(groupId: string): TabItemRow[] {
        this.ensureReady();
        const res = this.db.exec(
            `SELECT * FROM tab_items WHERE group_id = ? ORDER BY sort_order`,
            [groupId]
        );
        if (!res[0]) return [];
        return this.rowsToObjects<TabItemRow>(res[0]);
    }

    public getTabItemsByPath(fsPath: string): TabItemRow[] {
        this.ensureReady();
        const res = this.db.exec(`SELECT * FROM tab_items WHERE file_uri = ?`, [fsPath]);
        if (!res[0]) return [];
        return this.rowsToObjects<TabItemRow>(res[0]);
    }

    // ---------- BRANCHES API ----------

    public listBranches(): string[] {
        this.ensureReady();
        const res = this.db.exec(`SELECT DISTINCT branch_name FROM tabs_groups WHERE branch_name IS NOT NULL ORDER BY branch_name`);
        const rows = res?.[0]?.values ?? [];
        return rows.map((r: any[]) => String(r[0]));
    }

    public deleteBranch(branchName: string): void {
        this.ensureReady();
        // Delete all tab items in groups belonging to this branch
        const res = this.db.exec(`SELECT id FROM tabs_groups WHERE branch_name = ?`, [branchName]);
        const ids = res?.[0]?.values?.map((r: any[]) => r[0]) ?? [];
        for (const id of ids) {
            this.db.run(`DELETE FROM tab_items WHERE group_id = ?`, [id]);
        }
        this.db.run(`DELETE FROM tabs_groups WHERE branch_name = ?`, [branchName]);
    }

    // ---------- FLUSH ----------

    public flush(): Promise<void> {
        return this.enqueueFlush();
    }

    // ---------- Schema + Persistence ----------

    private initializeSchema(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS workspace_state(
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS tabs_groups(
                id TEXT PRIMARY KEY,
                branch_name TEXT,
                label TEXT NOT NULL,
                pinned INTEGER NOT NULL DEFAULT 0,
                tags TEXT NOT NULL DEFAULT '',
                create_time INTEGER NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0
            );
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_tabs_groups_branch ON tabs_groups(branch_name);
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS tab_items(
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                label TEXT NOT NULL,
                file_uri TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(group_id) REFERENCES tabs_groups(id)
            );
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_tab_items_group ON tab_items(group_id);
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_tab_items_uri ON tab_items(file_uri);
        `);
    }

    private ensureReady() {
        if (!this.initialized) {
            throw new Error("SqlJsDatabaseService not initialized. Call await init() in activate().");
        }
    }

    private async enqueueFlush(): Promise<void> {
        this.writeQueue = this.writeQueue.then(() => this.flushToDisk());
        return this.writeQueue;
    }

    private async flushToDisk(): Promise<void> {
        const data: Uint8Array = this.db.export();
        await fs.promises.writeFile(this.dbFilePath, Buffer.from(data));
    }

    private async readDbFileIfExists(): Promise<Uint8Array | undefined> {
        try {
            const buf = await fs.promises.readFile(this.dbFilePath);
            return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        } catch {
            return undefined;
        }
    }

    private rowsToObjects<T>(result: { columns: string[]; values: any[][] }): T[] {
        const { columns, values } = result;
        return values.map((row) => {
            const obj: any = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj as T;
        });
    }

    private async loadSqlJs(): Promise<SqlJsModule> {
        const extensionRoot = this.context.extensionUri;
        const { createRequire } = require("module");
        const requireFunc = createRequire(vscode.Uri.joinPath(extensionRoot, "package.json").fsPath);
        const sqlJsPath = vscode.Uri.joinPath(extensionRoot, "asset", "sql-wasm.js").fsPath;
        const initSqlJs = requireFunc(sqlJsPath);
        const wasmUri = vscode.Uri.joinPath(extensionRoot, "asset");

        const SQL: SqlJsModule = await initSqlJs({
            locateFile: (file: string) => {
                return vscode.Uri.joinPath(wasmUri, file).fsPath;
            },
        });

        return SQL;
    }
}