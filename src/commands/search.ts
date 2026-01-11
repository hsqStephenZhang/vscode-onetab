import * as vscode from 'vscode';
import { Global } from '../global';

let globalFilters: Set<string> = new Set();

interface FilterQuickPickItem extends vscode.QuickPickItem {
    groupID: string;
};

export async function searchGroup() {
    const items = Array.from(Global.tabsProvider.getState().groups.entries(), entry => {
        return {
            groupID: entry[0],
            label: entry[1].getText(),
        }
    });
    const options: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: "Select a filter to apply to the current view",
    }
    vscode.window.showQuickPick(items, options).then(async (selection) => {
        if (typeof selection === 'undefined') {
            return;
        }
        const groupItem = selection as FilterQuickPickItem;
        const group = Global.tabsProvider.getState().groups.get(groupItem.groupID);
        // const node = Global.tabsProvider.getChildren();
        if (typeof group === 'undefined') {
            vscode.window.showErrorMessage("Failed to apply filter: group not found");
            return;
        }
        Global.logger.info("Filter selected(1): " + groupItem + "group id: {}", group.id);
        const treeview = Global.tabsProvider.getTreeView();
        if (typeof treeview === 'undefined') {
            vscode.window.showErrorMessage("Failed to apply filter: treeview not found");
            return;
        }
        await treeview.reveal(group, { select: false, focus: true, expand: true });
    });
}

export async function filterByTag() {
  const state = Global.tabsProvider.getState();
  
  // Collect all tags with group count
  const tagCounts = new Map<string, number>();
  for (const [, group] of state.groups) {
    for (const tag of group.getTags()) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  
  if (tagCounts.size === 0) {
    vscode.window.showInformationMessage('No tags found. Add tags to groups first.');
    return;
  }
  
  const items: vscode.QuickPickItem[] = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({
      label: `#${tag}`,
      description: `${count} group${count > 1 ? 's' : ''}`,
    }));
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a tag to filter groups',
  });
  
  if (!selected) return;
  
  const selectedTag = selected.label.slice(1); // Remove #
  await filterByTagDirect(selectedTag);
}

export async function filterByTagDirect(tag: string) {
  const state = Global.tabsProvider.getState();
  
  // Find groups with the selected tag
  const matchingGroups = Array.from(state.groups.values())
    .filter(group => group.getTags().includes(tag));
  
  if (matchingGroups.length === 0) {
    vscode.window.showInformationMessage(`No groups found with tag "${tag}".`);
    return;
  }
  
  if (matchingGroups.length === 1) {
    // Directly reveal the only matching group
    const treeview = Global.tabsProvider.getTreeView();
    await treeview?.reveal(matchingGroups[0], { select: false, focus: true, expand: true });
    return;
  }
  
  // Show matching groups
  const groupItems = matchingGroups.map(group => ({
    label: group.getLabel(),
    description: group.getTags().map(t => `#${t}`).join(' '),
    groupId: group.id,
  }));
  
  const selectedGroup = await vscode.window.showQuickPick(groupItems, {
    placeHolder: `${matchingGroups.length} group(s) with tag #${tag}`,
  });
  
  if (selectedGroup && selectedGroup.groupId) {
    const group = state.groups.get(selectedGroup.groupId);
    if (group) {
      const treeview = Global.tabsProvider.getTreeView();
      await treeview?.reveal(group, { select: false, focus: true, expand: true });
    }
  }
}