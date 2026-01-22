# Branch Data Loss Fix

## Problem Summary

After switching between git branches, group data was being lost. The symptoms were:
- `branch:demo:groups` would show group IDs like `["873c93f3-..."]`
- But the corresponding `group:data:873c93f3-...` would be missing
- Branch change events were firing 5-8 times per switch

## Root Causes

### 1. Duplicate Branch Change Processing

The `reinitGitBranchGroups` function was being called multiple times:
- Once by the initial setup
- Multiple times by the GitFileWatcher detecting `.git` file changes during branch switch
- Each call registered its own `onDidChange` listener
- All listeners would fire on a single branch change

**Issue**: The `isProcessing` flag was scoped locally to each function call, so it couldn't prevent duplicate processing across multiple listener instances.

### 2. Group Data Deletion Bug

The critical bug was in `clearTabsGroups()`:

```typescript
// BEFORE (BUG):
public async clearTabsGroups(branchName: string | null): Promise<void> {
    const groupIds = this.getBranchGroupIds(branchName);
    
    for (const groupId of groupIds) {
        await this.deleteGroupData(groupId);  // ❌ Deletes globally!
    }
    
    await this.setBranchGroupIds(branchName, []);
}
```

**What happened:**
1. When switching from `demo` to `b1`:
   - Active state has groups with IDs `[A, B]` (branch_name = null)
   - Clone state with `deepClone(true)` preserving IDs → still `[A, B]`
   - Set branchName = "demo" on the clone
   - Call `saveToStorage()` for "demo" branch

2. `saveToStorage()` calls `clearTabsGroups("demo")`:
   - Gets group IDs for "demo": `[A, B]`
   - **Deletes group data for A and B globally** (not just for "demo")
   - Clears "demo" group ID list

3. Then tries to insert groups A and B back:
   - But if a second duplicate event fires...
   - It tries to save again, but now there are no groups to save!

**The Core Issue**: Group data is stored globally by ID (`group:data:${id}`), not scoped by branch. When we use `deepClone(true)` to preserve IDs across branches, multiple branches can reference the same group IDs. Deleting the group data for one branch deletes it for ALL branches using that ID.

## The Fix

### Fix 1: Global `isProcessingBranchChange` Flag

**File**: `src/utils/git.ts`

```typescript
// Global flag to prevent duplicate branch change processing
let isProcessingBranchChange = false;

export function reinitGitBranchGroups(git: API): vscode.Disposable | void {
    // ... setup code ...
    
    return repo.state.onDidChange(async () => {
        if (repo.state.HEAD?.name !== Global.branchName) {
            if (isProcessingBranchChange) {
                Global.logger.debug(`Branch change already in progress, skipping duplicate event`);
                return;  // ✅ Skip duplicate events
            }
            
            isProcessingBranchChange = true;
            try {
                // ... branch switch logic ...
            } finally {
                isProcessingBranchChange = false;
            }
        }
    });
}
```

**Why this works**: The flag is now global (module-scoped), so even if multiple listeners are registered, they all check the same flag and only the first one processes the change.

### Fix 2: Check References Before Deleting Group Data

**File**: `src/db/storageService.ts`

```typescript
public async clearTabsGroups(branchName: string | null): Promise<void> {
    const groupIds = this.getBranchGroupIds(branchName);

    // Collect all group IDs from other branches (including active)
    const activeGroupIds = this.getBranchGroupIds(null);
    const allBranchIds = this.getBranchIds();
    const otherBranchGroupIds = new Set<string>();
    
    activeGroupIds.forEach(id => otherBranchGroupIds.add(id));
    for (const otherBranch of allBranchIds) {
        if (otherBranch !== branchName) {
            const ids = this.getBranchGroupIds(otherBranch);
            ids.forEach(id => otherBranchGroupIds.add(id));
        }
    }

    // ✅ Only delete group data if it's not referenced elsewhere
    for (const groupId of groupIds) {
        if (!otherBranchGroupIds.has(groupId)) {
            await this.deleteGroupData(groupId);
        }
    }

    await this.setBranchGroupIds(branchName, []);
}
```

**Why this works**: Before deleting group data, we check if any other branch (including the active branch) still references that group ID. We only delete the data if no other branch is using it.

### Fix 3: Collect Data Before Clearing (Secondary Protection)

**File**: `src/model/tabstate.ts`

The `saveToStorage()` method was also improved to collect all group data **before** calling `clearTabsGroups()`, preventing race conditions where multiple saves could interfere with each other.

```typescript
public async saveToStorage(): Promise<void> {
    const storage = Global.storage;

    // ✅ Collect all data FIRST
    const groupsToSave: Array<{ row: TabsGroupRow; tabs: TabItemRow[] }> = [];
    
    for (const group of this.getAllTabsGroupsSorted()) {
        // ... collect group and tab data ...
        groupsToSave.push({ row, tabs });
    }

    // Now perform operations atomically
    await storage.clearTabsGroups(this.branchName);

    for (const { row, tabs } of groupsToSave) {
        await storage.insertTabsGroup(row);
        for (const tabRow of tabs) {
            await storage.insertTabItem(tabRow);
        }
    }
}
```

## Testing

After these fixes:
1. Branch change events should only be processed once (you'll see only one "Branch changed" log)
2. Group data should be preserved after branch switches
3. Switching between branches multiple times should maintain all group data
4. The group data for the active branch should never be deleted when saving another branch

## Related Issues

This fix complements the earlier `deepClone(preserveId)` fix that prevented duplicate group creation. Together, they ensure:
- Group IDs are preserved when saving branches (no duplicates)
- Group data is preserved when switching branches (no data loss)
