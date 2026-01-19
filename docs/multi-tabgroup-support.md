# Multi-TabGroup Support

## Overview

This extension now fully supports VSCode's multiple editor groups (split views). When you save tabs to OneTab groups, the extension preserves which VSCode editor group (split pane) each tab was in, and restores them to the same editor group when you reopen them.

## What Changed

### 1. ViewColumn Tracking
- **TabItem Model**: Added `viewColumn` property to track which VSCode editor group a tab belongs to
- **Storage**: Extended `TabItemRow` interface to persist `view_column` information
- **Send Operations**: When sending tabs to OneTab, the extension now captures and saves the `viewColumn` for each tab
- **Restore Operations**: When restoring tabs, they are opened in their original editor group (if available)

### 2. How It Works

#### Saving Tabs
When you use any "Send to OneTab" command:
1. The extension collects tabs from **all** editor groups (flattened)
2. For each tab, it captures the `viewColumn` (which editor group it's in)
3. This information is stored alongside the tab's URI and other metadata

#### Restoring Tabs
When you restore tabs or tab groups:
1. The extension reads the saved `viewColumn` for each tab
2. Opens the tab in the corresponding editor group using `vscode.window.showTextDocument(doc, viewColumn)`
3. Falls back to `ViewColumn.Active` if no viewColumn was saved

#### Reordering Tabs
The `reorderTabsByOnetabGroups` command:
- Processes each VSCode editor group **independently**
- Reorders tabs within each group based on your OneTab group organization
- Preserves the editor group structure (doesn't move tabs between splits)

### 3. Code Changes

#### Files Modified

1. **src/db/storageService.ts**
   - Added `view_column?: number` to `TabItemRow` interface

2. **src/model/tabitem.ts**
   - Added `viewColumn?: vscode.ViewColumn` property
   - Updated `fromRow()` to parse viewColumn from storage
   - Updated `deepClone()` to copy viewColumn
   - Added `setViewColumn()` method

3. **src/model/tabstate.ts**
   - Updated `persistChanges()` to save viewColumn
   - Updated `saveToStorage()` to save viewColumn

4. **src/utils/tab.ts**
   - Updated `sendTabs()` to capture viewColumn from tab's parent group

5. **src/commands/tab.ts**
   - Updated `openTabItem()` to accept and use viewColumn parameter
   - Updated `tabRestore()` to pass viewColumn when restoring

6. **src/commands/tabsGroup.ts**
   - Updated `openTabItem()` helper to accept and use viewColumn
   - Updated `tabsGroupRestore()` to pass viewColumn for each tab

### 4. Tests

Created comprehensive test suite in `src/test/suite/integration/multiTabGroup.test.ts`:

- ✅ Collect tabs from all editor groups
- ✅ Handle left/right tabs with multiple editor groups
- ✅ Handle "other tabs" across editor groups
- ✅ Preserve viewColumn information
- ✅ Process each editor group separately for reordering
- ✅ Handle tab closure across multiple groups
- ✅ Identify active tab across editor groups
- ✅ Handle pinned tabs in multiple editor groups

## Usage Examples

### Example 1: Save Tabs from Multiple Splits

```
Editor Layout:
├─ Column 1 (One)
│  ├─ file1.ts
│  └─ file2.ts
├─ Column 2 (Two)
│  ├─ file3.ts
│  └─ file4.ts
```

When you run "Send All Tabs", all 4 tabs are saved with their viewColumn info:
- file1.ts → viewColumn: 1
- file2.ts → viewColumn: 1  
- file3.ts → viewColumn: 2
- file4.ts → viewColumn: 2

### Example 2: Restore Tabs to Original Splits

When you restore the saved group, tabs reopen in their original columns:
- file1.ts, file2.ts → Open in Column 1
- file3.ts, file4.ts → Open in Column 2

### Example 3: Reorder Tabs Per Editor Group

The reorder command organizes tabs within each split independently:
```
Before:
├─ Column 1: [utils.ts, main.ts, config.ts]
├─ Column 2: [test1.ts, test2.ts]

After reordering by OneTab groups "Main Code", "Tests":
├─ Column 1: [main.ts, utils.ts, config.ts]  (organized by group within column 1)
├─ Column 2: [test1.ts, test2.ts]             (organized by group within column 2)
```

## Backwards Compatibility

- Existing saved tabs without `view_column` will restore to `ViewColumn.Active` (current behavior)
- No migration needed - old data continues to work
- New saves will include viewColumn information automatically

## Future Enhancements

Potential improvements:
1. **Smart Multi-Column Restore**: Option to restore tabs in a specific layout (e.g., "restore this group across 2 columns")
2. **Column-Aware Send**: Option to send only tabs from the current editor group
3. **Layout Templates**: Save and restore complete editor layouts with splits
4. **Cross-Column Organization**: Move tabs between editor groups during reorder

## Technical Notes

- VSCode's `ViewColumn` enum: `One = 1`, `Two = 2`, `Three = 3`, etc.
- The `Active` value (-1) opens in the currently active column
- Editor groups are ephemeral - if you close a split, tabs restore to available columns
- The extension respects VSCode's editor group lifecycle and doesn't force-create splits
