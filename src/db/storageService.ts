import * as vscode from "vscode";
import { AccessTracking } from "../model/accessTracking";

export interface TabItemRow {
    id: string;
    group_id: string;
    label: string;
    file_uri: string;
    original_uri?: string;
    tab_type?: string;
    sort_order: number;
}

export interface TabsGroupRow {
    id: string;
    branch_name: string | null;
    label: string;
    pinned: number;
    tags: string;
    create_time: number;
    sort_order: number;
}

// Data structure for serialized group with its tabs
export interface GroupData {
    id: string;
    branch_name: string | null;
    label: string;
    pinned: number;
    tags: string;
    create_time: number;
    sort_order: number;
    tabs: TabItemRow[];
}

export class StorageService {
    constructor(private readonly workspaceState: vscode.Memento) { }

    // ---------- WORKSPACE STATE KV API ----------

    public getWorkspaceState(key: string): string | undefined {
        return this.workspaceState.get<string>(key);
    }

    public setWorkspaceState(key: string, value: string): Thenable<void> {
        return this.workspaceState.update(key, value);
    }

    public deleteWorkspaceState(key: string): Thenable<void> {
        return this.workspaceState.update(key, undefined);
    }

    public listWorkspaceKeys(): readonly string[] {
        return this.workspaceState.keys();
    }

    // ---------- BRANCH MANAGEMENT (KV-based) ----------

    public getBranchIds(): string[] {
        const idsStr = this.getWorkspaceState("branch:ids");
        return idsStr ? JSON.parse(idsStr) : [];
    }

    public setBranchIds(ids: string[]): Thenable<void> {
        return this.setWorkspaceState("branch:ids", JSON.stringify(ids));
    }

    public getBranchGroupIds(branchName: string | null): string[] {
        const key = branchName === null ? "branch:active:groups" : `branch:${branchName}:groups`;
        const idsStr = this.getWorkspaceState(key);
        return idsStr ? JSON.parse(idsStr) : [];
    }

    public setBranchGroupIds(branchName: string | null, groupIds: string[]): Thenable<void> {
        const key = branchName === null ? "branch:active:groups" : `branch:${branchName}:groups`;
        return this.setWorkspaceState(key, JSON.stringify(groupIds));
    }

    // ---------- GROUP DATA (KV-based) ----------

    public getGroupData(groupId: string): GroupData | undefined {
        const dataStr = this.getWorkspaceState(`group:data:${groupId}`);
        if (!dataStr) return undefined;
        try {
            return JSON.parse(dataStr) as GroupData;
        } catch {
            return undefined;
        }
    }

    public setGroupData(groupData: GroupData): Thenable<void> {
        return this.setWorkspaceState(`group:data:${groupData.id}`, JSON.stringify(groupData));
    }

    public deleteGroupData(groupId: string): Thenable<void> {
        return this.deleteWorkspaceState(`group:data:${groupId}`);
    }

    // ---------- TABS GROUPS API (High-level) ----------

    public async insertTabsGroup(group: TabsGroupRow): Promise<void> {
        const branchGroupIds = this.getBranchGroupIds(group.branch_name);

        if (!branchGroupIds.includes(group.id)) {
            branchGroupIds.push(group.id);
        }

        // Update branch group IDs
        await this.setBranchGroupIds(group.branch_name, branchGroupIds);

        // Create group data with empty tabs
        const groupData: GroupData = {
            ...group,
            tabs: [],
        };

        // Update branch IDs if new branch
        if (group.branch_name !== null) {
            const branchIds = this.getBranchIds();
            if (!branchIds.includes(group.branch_name)) {
                branchIds.push(group.branch_name);
                await this.setBranchIds(branchIds);
            }
        }

        await this.setGroupData(groupData);
    }

    public async updateTabsGroup(group: TabsGroupRow): Promise<void> {
        const groupData = this.getGroupData(group.id);
        if (!groupData) return;

        const updated: GroupData = {
            ...groupData,
            label: group.label,
            pinned: group.pinned,
            tags: group.tags,
            sort_order: group.sort_order,
        };

        await this.setGroupData(updated);
    }

    public async updateTabsGroupPin(id: string, pinned: number): Promise<void> {
        const groupData = this.getGroupData(id);
        if (!groupData) return;

        groupData.pinned = pinned;
        await this.setGroupData(groupData);
    }

    public async updateTabsGroupLabel(id: string, label: string): Promise<void> {
        const groupData = this.getGroupData(id);
        if (!groupData) return;

        groupData.label = label;
        await this.setGroupData(groupData);
    }

    public async updateTabsGroupTags(id: string, tags: string): Promise<void> {
        const groupData = this.getGroupData(id);
        if (!groupData) return;

        groupData.tags = tags;
        await this.setGroupData(groupData);
    }

    public async deleteTabsGroup(id: string): Promise<void> {
        const groupData = this.getGroupData(id);
        if (!groupData) return;

        // Remove from branch group IDs
        const branchGroupIds = this.getBranchGroupIds(groupData.branch_name);
        const updated = branchGroupIds.filter(gid => gid !== id);
        await this.setBranchGroupIds(groupData.branch_name, updated);

        // Delete the group data itself
        await this.deleteGroupData(id);
    }

    public getTabsGroups(branchName: string | null): TabsGroupRow[] {
        const groupIds = this.getBranchGroupIds(branchName);
        const groups: TabsGroupRow[] = [];

        for (const groupId of groupIds) {
            const groupData = this.getGroupData(groupId);
            if (groupData) {
                groups.push({
                    id: groupData.id,
                    branch_name: groupData.branch_name,
                    label: groupData.label,
                    pinned: groupData.pinned,
                    tags: groupData.tags,
                    create_time: groupData.create_time,
                    sort_order: groupData.sort_order,
                });
            }
        }

        // Sort by sort_order, then create_time descending
        return groups.sort((a, b) => {
            if (a.sort_order !== b.sort_order) {
                return a.sort_order - b.sort_order;
            }
            return b.create_time - a.create_time;
        });
    }

    public getTabsGroupById(id: string): TabsGroupRow | undefined {
        const groupData = this.getGroupData(id);
        if (!groupData) return undefined;

        return {
            id: groupData.id,
            branch_name: groupData.branch_name,
            label: groupData.label,
            pinned: groupData.pinned,
            tags: groupData.tags,
            create_time: groupData.create_time,
            sort_order: groupData.sort_order,
        };
    }

    public async clearTabsGroups(branchName: string | null): Promise<void> {
        const groupIds = this.getBranchGroupIds(branchName);

        // Before deleting group data, check if it's still referenced by other branches
        // Since we preserve IDs when cloning, multiple branches may share the same group IDs
        const activeGroupIds = this.getBranchGroupIds(null);
        const allBranchIds = this.getBranchIds();
        const otherBranchGroupIds = new Set<string>();
        
        // Collect all group IDs from other branches (including active)
        activeGroupIds.forEach(id => otherBranchGroupIds.add(id));
        for (const otherBranch of allBranchIds) {
            if (otherBranch !== branchName) {
                const ids = this.getBranchGroupIds(otherBranch);
                ids.forEach(id => otherBranchGroupIds.add(id));
            }
        }

        // Only delete group data if it's not referenced elsewhere
        for (const groupId of groupIds) {
            if (!otherBranchGroupIds.has(groupId)) {
                await this.deleteGroupData(groupId);
            }
        }

        await this.setBranchGroupIds(branchName, []);
    }

    // ---------- TAB ITEMS API ----------

    public async insertTabItem(item: TabItemRow): Promise<void> {
        const groupData = this.getGroupData(item.group_id);
        if (!groupData) return;

        // Add or update tab in group
        const existing = groupData.tabs.findIndex(t => t.id === item.id);
        if (existing >= 0) {
            groupData.tabs[existing] = item;
        } else {
            groupData.tabs.push(item);
        }

        await this.setGroupData(groupData);
    }

    public async deleteTabItem(id: string): Promise<void> {
        // Find which group contains this tab
        const branchIds = this.getBranchIds();
        const allGroupIds = new Set<string>();

        // Add active branch groups
        this.getBranchGroupIds(null).forEach(gid => allGroupIds.add(gid));

        for (const branchName of branchIds) {
            this.getBranchGroupIds(branchName).forEach(gid => allGroupIds.add(gid));
        }

        for (const groupId of allGroupIds) {
            const groupData = this.getGroupData(groupId);
            if (groupData && groupData.tabs.some(t => t.id === id)) {
                groupData.tabs = groupData.tabs.filter(t => t.id !== id);
                await this.setGroupData(groupData);
                return;
            }
        }
    }

    public deleteTabItemsByGroupId(groupId: string): void {
        const groupData = this.getGroupData(groupId);
        if (!groupData) return;

        groupData.tabs = [];
        this.setGroupData(groupData);
    }

    public async deleteTabItemByPath(groupId: string, fsPath: string): Promise<void> {
        const groupData = this.getGroupData(groupId);
        if (!groupData) return;

        groupData.tabs = groupData.tabs.filter(t => t.file_uri !== fsPath);
        await this.setGroupData(groupData);
    }

    public getTabItems(groupId: string): TabItemRow[] {
        const groupData = this.getGroupData(groupId);
        if (!groupData) return [];

        return groupData.tabs.sort((a, b) => a.sort_order - b.sort_order);
    }

    public getTabItemsByPath(fsPath: string): TabItemRow[] {
        const branchIds = this.getBranchIds();
        const allItems: TabItemRow[] = [];
        const allGroupIds = new Set<string>();

        // Add active branch groups
        this.getBranchGroupIds(null).forEach(gid => allGroupIds.add(gid));

        for (const branchName of branchIds) {
            this.getBranchGroupIds(branchName).forEach(gid => allGroupIds.add(gid));
        }

        for (const groupId of allGroupIds) {
            const groupData = this.getGroupData(groupId);
            if (groupData) {
                const items = groupData.tabs.filter(t => t.file_uri === fsPath);
                allItems.push(...items);
            }
        }

        return allItems;
    }

    // ---------- BRANCHES API ----------

    public listBranches(): string[] {
        return this.getBranchIds();
    }

    public async deleteBranch(branchName: string): Promise<void> {
        const groupIds = this.getBranchGroupIds(branchName);

        for (const groupId of groupIds) {
            await this.deleteGroupData(groupId);
        }

        const branchIds = this.getBranchIds();
        await this.setBranchIds(branchIds.filter(id => id !== branchName));
        await this.setBranchGroupIds(branchName, []);
    }

    // ---------- FLUSH (NO-OP for VS Code storage) ----------

    public async flush(): Promise<void> {
        // VS Code handles persistence automatically
    }

    // Dummy methods for backwards compatibility
    public run(_sql: string, _params: any[] = []): void {
        // No-op
    }

    public async close(): Promise<void> {
        // No-op
    }

    public async init(): Promise<void> {
        // No-op - VS Code storage is ready immediately
    }

    // ---------- ACCESS TRACKING API ----------

    /**
     * Get access tracking data for a group
     */
    public getAccessTracking(groupId: string): AccessTracking | undefined {
        const trackingStr = this.getWorkspaceState(`tracking:${groupId}`);
        if (!trackingStr) return undefined;
        try {
            return AccessTracking.fromJSON(trackingStr);
        } catch {
            return undefined;
        }
    }

    /**
     * Save access tracking data for a group
     */
    public async setAccessTracking(tracking: AccessTracking): Promise<void> {
        return this.setWorkspaceState(`tracking:${tracking.groupId}`, tracking.toJSON());
    }

    /**
     * Record an access event for a group
     */
    public async recordGroupAccess(groupId: string): Promise<void> {
        let tracking = this.getAccessTracking(groupId);
        if (!tracking) {
            tracking = new AccessTracking(groupId);
        }
        tracking.recordAccess();
        await this.setAccessTracking(tracking);
    }

    /**
     * Delete access tracking data for a group
     */
    public async deleteAccessTracking(groupId: string): Promise<void> {
        return this.deleteWorkspaceState(`tracking:${groupId}`);
    }

    /**
     * Get all access tracking data (for all groups)
     */
    public getAllAccessTracking(): Map<string, AccessTracking> {
        const trackingMap = new Map<string, AccessTracking>();
        const keys = this.listWorkspaceKeys();

        for (const key of keys) {
            if (key.startsWith('tracking:')) {
                const groupId = key.substring('tracking:'.length);
                const trackingStr = this.getWorkspaceState(key);
                if (trackingStr) {
                    try {
                        const tracking = AccessTracking.fromJSON(trackingStr);
                        trackingMap.set(groupId, tracking);
                    } catch {
                        // Skip invalid entries
                    }
                }
            }
        }

        return trackingMap;
    }
}