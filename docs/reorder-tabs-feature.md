# Reorder Tabs by OneTab Groups Feature

## Overview
This feature allows you to organize currently open tabs based on your saved OneTab TabsGroups. Tabs belonging to the same OneTab group will be placed together, making your workspace clean and organized.

## Features

### Two Commands Available

1. **Reorder Tabs By Groups (Select Groups)**
   - Command: `onetab.reorder.selectGroups`
   - Allows you to select which OneTab TabsGroups to use for organizing
   - Shows group names, tab counts, tags, and creation dates
   - Pre-selects all groups for convenience

2. **Reorder All Tabs By Groups**
   - Command: `onetab.reorder.allGroups`
   - Immediately organizes tabs using all OneTab groups
   - No selection dialog

## How It Works

The reordering follows this pattern:

1. **Pinned tabs in OneTab groups** are placed first
2. **Pinned ungrouped tabs** come next
3. **Unpinned tabs in OneTab groups** follow
4. **Unpinned ungrouped tabs** (not in any OneTab group) are placed at the end

Tabs belonging to the same OneTab group are kept together.

## Usage

### Via Command Palette

1. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
2. Type "Reorder Tabs"
3. Select either:
   - "Reorder Tabs By Groups (Select Groups)" - to choose specific OneTab groups
   - "Reorder All Tabs By Groups" - to organize using all OneTab groups

### Interactive Selection

When using "Reorder Tabs By Groups (Select Groups)":

1. A quick pick menu appears showing all your OneTab TabsGroups
2. Each group shows:
   - Group name with folder icon
   - Number of tabs in the group
   - Tags associated with the group
   - Creation date
3. Select which OneTab groups you want to use for organizing
4. If you selected multiple groups, you'll be asked:
   - **Use Current Order** - Apply groups in the order you selected them
   - **Customize Group Order** - Manually arrange the order of groups
5. If you chose to customize order:
   - Select a group to move it
   - Choose its new position
   - Repeat until satisfied
   - Select "Done" to apply
6. Press Enter to apply the reordering

## Example

**Your OneTab Groups:**
- "React Components" - containing: Header.tsx, Footer.tsx, Button.tsx
- "API Routes" - containing: auth.ts, users.ts
- "Tests" - containing: auth.test.ts, users.test.ts

**Scenario: You want Tests first, then React, then API**

**Before (tabs are mixed):**
```
Open Tabs:
1. Header.tsx 📌 (pinned)
2. auth.ts
3. Button.tsx
4. users.test.ts
5. Footer.tsx
6. auth.test.ts
7. config.json (not in any OneTab group)
```

**After selecting groups and customizing order (Tests → React → API):**
```
Open Tabs:
1. Header.tsx 📌 (pinned - in React Components group)
2. auth.test.ts (Tests group - first in order)
3. users.test.ts (Tests group)
4. Button.tsx (React Components group - second in order)
5. Footer.tsx (React Components group)
6. auth.ts (API Routes group - third in order)
7. users.ts (API Routes group)
8. config.json (ungrouped - at the end)
```

## Technical Details

- The feature matches currently open tabs to your saved OneTab TabsGroups by file URI
- Tabs are temporarily closed and immediately reopened in the correct order
- The operation is very fast to minimize disruption
- The currently active tab is restored after reordering
- Tab pin status is preserved
- Only saveable tab types are reordered (text files, notebooks, diffs, etc.)

## Notes

- Unsaved changes in tabs are preserved (files remain dirty)
- The active tab remains active after reordering
- This works across all editor groups (split views) independently
- You must have saved tabs to OneTab groups first for this feature to work
- Tabs not belonging to any selected OneTab group are placed at the end
- The reordering happens by closing and reopening tabs (this is a VS Code API limitation)
- **Group order matters**: When you select multiple groups, you can customize their order to control how tabs are organized
- The order you specify determines which group's tabs appear first

## Notes

- Unsaved changes in tabs are preserved
- The active tab remains active after reordering
- This feature works with all supported tab types in the Onetab extension
