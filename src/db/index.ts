import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

type SqlJsDatabase = any;

type SqlJsModule = {
    Database: new (data?: Uint8Array) => SqlJsDatabase;
};

export class SqlJsDatabaseService {
    private db!: SqlJsDatabase;
    private initialized = false;

    // file on disk where we persist the database bytes
    private readonly dbFilePath: string;

    // serialize writes
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(private readonly context: vscode.ExtensionContext) {
        // globalStorageUri is the right place for extension-owned data
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
        // persist one last time
        if (!this.initialized) return;
        await this.flushToDisk();
        try {
            this.db?.close?.();
        } catch {
            // ignore
        }
        this.initialized = false;
    }

    // ---------- KV API (mirrors what WorkState needs) ----------

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

    // Branch table helpers (optional; you can also store branches JSON in workspace_state)
    public getBranch(branchName: string): string | undefined {
        this.ensureReady();
        const stmt = this.db.prepare(`SELECT state FROM branches WHERE branch_name = ? LIMIT 1`);
        try {
            stmt.bind([branchName]);
            if (stmt.step()) return (stmt.getAsObject().state as string) ?? undefined;
            return undefined;
        } finally {
            stmt.free();
        }
    }

    public setBranch(branchName: string, stateJson: string): Promise<void> {
        this.ensureReady();
        const now = Date.now();
        this.db.run(
            `INSERT INTO branches(branch_name, state, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(branch_name) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at`,
            [branchName, stateJson, now]
        );
        return this.enqueueFlush();
    }

    public deleteBranch(branchName: string): Promise<void> {
        this.ensureReady();
        this.db.run(`DELETE FROM branches WHERE branch_name = ?`, [branchName]);
        return this.enqueueFlush();
    }

    public listBranches(): string[] {
        this.ensureReady();
        const res = this.db.exec(`SELECT branch_name FROM branches ORDER BY branch_name`);
        const rows = res?.[0]?.values ?? [];
        return rows.map((r: any[]) => String(r[0]));
    }

    // ---------- schema + persistence ----------

    private initializeSchema(): void {
        this.db.run(`
      CREATE TABLE IF NOT EXISTS workspace_state(
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

        this.db.run(`
      CREATE TABLE IF NOT EXISTS branches(
        branch_name TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    }

    private ensureReady() {
        if (!this.initialized) {
            throw new Error("SqlJsDatabaseService not initialized. Call await init() in activate().");
        }
    }

    private async enqueueFlush(): Promise<void> {
        // serialize flush operations
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

    private async loadSqlJs(): Promise<SqlJsModule> {
        const extensionRoot = this.context.extensionUri;
        
        // Dynamically require sql.js to avoid webpack bundling issues with the Emscripten module.
        // We use createRequire to load the file from disk at runtime.
        const { createRequire } = require("module");
        const requireFunc = createRequire(vscode.Uri.joinPath(extensionRoot, "package.json").fsPath);

        const sqlJsPath = vscode.Uri.joinPath(extensionRoot, "asset", "sql-wasm.js").fsPath;
        const initSqlJs = requireFunc(sqlJsPath);

        const wasmUri = vscode.Uri.joinPath(extensionRoot, "asset");

        const SQL: SqlJsModule = await initSqlJs({
            locateFile: (file: string) => {
                // file is usually "sql-wasm.wasm"
                return vscode.Uri.joinPath(wasmUri, file).fsPath;
            },
        });

        return SQL;
    }
}