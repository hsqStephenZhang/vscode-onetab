// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { reorderTabsByOnetabGroups } from "../utils/tab";
import { Global } from "../global";
import { TabsGroup } from "../model/tabsgroup";

/**
 * Command to reorder currently open tabs based on OneTab's saved TabsGroups
 * Allows user to select which OneTab TabsGroups to use for organizing
 */
export async function reorderTabsByGroupsCommand(): Promise<void> {
  // Get all OneTab TabsGroups from the current state
  let allTabsGroups: TabsGroup[] = [];
  
  Global.tabsProvider.updateState((state) => {
    allTabsGroups = Array.from(state.groups.values());
  });
  
  if (allTabsGroups.length === 0) {
    vscode.window.showInformationMessage('No OneTab groups found. Save some tabs first!');
    return;
  }
  
  // Create quick pick items for each OneTab TabsGroup
  interface TabsGroupQuickPickItem extends vscode.QuickPickItem {
    groupId: string;
  }
  
  const items: TabsGroupQuickPickItem[] = allTabsGroups.map(group => {
    const tabCount = group.tabs.length;
    const tags = group.getTags();
    const tagStr = tags.length > 0 ? tags.join(', ') : 'No tags';
    
    return {
      label: `$(folder) ${group.getLabel()}`,
      description: `${tabCount} tab${tabCount !== 1 ? 's' : ''}`,
      detail: `Tags: ${tagStr} | Created: ${new Date(group.createTime).toLocaleDateString()}`,
      groupId: group.id!,
      picked: true // Pre-select all groups
    };
  });
  
  // Add "All Groups" option at the top
  const allGroupsItem: TabsGroupQuickPickItem = {
    label: '$(list-tree) All OneTab Groups',
    description: `Organize by all ${allTabsGroups.length} groups`,
    detail: 'Select this to use all OneTab groups for reordering',
    groupId: '__ALL__',
    picked: true
  };
  
  const quickPick = vscode.window.createQuickPick<TabsGroupQuickPickItem>();
  quickPick.title = 'Select OneTab Groups to Organize By';
  quickPick.placeholder = 'Choose which OneTab groups to use for organizing open tabs';
  quickPick.canSelectMany = true;
  quickPick.items = [allGroupsItem, ...items];
  quickPick.selectedItems = [allGroupsItem, ...items];
  
  quickPick.onDidChangeSelection(selection => {
    // If "All Groups" is selected, select all other items
    if (selection.some(item => item.groupId === '__ALL__')) {
      if (selection.length === allTabsGroups.length + 1) {
        // All already selected
      } else {
        quickPick.selectedItems = [allGroupsItem, ...items];
      }
    } else {
      // If all individual groups are selected, also select "All Groups"
      if (selection.length === allTabsGroups.length) {
        quickPick.selectedItems = [allGroupsItem, ...items];
      }
    }
  });
  
  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems;
    quickPick.hide();
    
    if (selected.length === 0) {
      vscode.window.showInformationMessage('No OneTab groups selected');
      return;
    }
    
    // Check if "All Groups" is selected or all individual groups are selected
    const hasAllGroups = selected.some(item => item.groupId === '__ALL__');
    let selectedGroupIds = selected
      .filter(item => item.groupId !== '__ALL__')
      .map(item => item.groupId);
    
    if (hasAllGroups || selectedGroupIds.length === allTabsGroups.length) {
      selectedGroupIds = allTabsGroups.map(g => g.id!);
    }

    // If more than one group selected, ask if user wants to reorder them
    if (selectedGroupIds.length > 1) {
      const shouldReorderGroups = await vscode.window.showQuickPick(
        [
          { label: '$(check) Use Current Order', description: 'Apply groups in the order you selected them', value: false },
          { label: '$(arrow-swap) Customize Group Order', description: 'Manually arrange the order of groups', value: true }
        ],
        {
          title: 'Group Order',
          placeHolder: 'Would you like to customize the order of groups?'
        }
      );

      if (shouldReorderGroups === undefined) {
        return; // User cancelled
      }

      if (shouldReorderGroups.value) {
        // Let user reorder the groups
        const orderedGroupIds = await reorderGroupsInteractively(selectedGroupIds, allTabsGroups);
        if (orderedGroupIds) {
          selectedGroupIds = orderedGroupIds;
        } else {
          return; // User cancelled
        }
      }
    }

    // Reorder using selected groups in specified order
    await reorderTabsByOnetabGroups(selectedGroupIds);
  });
  
  quickPick.show();
}

/**
 * Allow user to interactively reorder OneTab groups
 */
async function reorderGroupsInteractively(
  groupIds: string[], 
  allGroups: TabsGroup[]
): Promise<string[] | undefined> {
  const groupsMap = new Map(allGroups.map(g => [g.id!, g]));
  let orderedIds = [...groupIds];

  while (true) {
    interface GroupOrderItem extends vscode.QuickPickItem {
      action: 'done' | 'move';
      groupId?: string;
      currentIndex?: number;
    }

    const orderItems: GroupOrderItem[] = orderedIds.map((id, index) => {
      const group = groupsMap.get(id);
      return {
        label: `${index + 1}. $(folder) ${group?.getLabel() || 'Unknown'}`,
        description: `${group?.tabs.length || 0} tabs`,
        detail: 'Click to move this group',
        action: 'move' as const,
        groupId: id,
        currentIndex: index
      };
    });

    orderItems.push({
      label: '$(check) Done - Apply This Order',
      description: 'Finish reordering and organize tabs',
      detail: '',
      action: 'done' as const
    });

    const selected = await vscode.window.showQuickPick(orderItems, {
      title: 'Reorder Groups (Current Order)',
      placeHolder: 'Select a group to move, or choose Done to apply'
    });

    if (!selected) {
      return undefined; // User cancelled
    }

    if (selected.action === 'done') {
      return orderedIds;
    }

    if (selected.action === 'move' && selected.groupId && selected.currentIndex !== undefined) {
      // Ask where to move it
      const positions = orderedIds.map((_, index) => ({
        label: `Position ${index + 1}`,
        description: index === selected.currentIndex ? '(current)' : '',
        index
      }));

      const newPosition = await vscode.window.showQuickPick(positions, {
        title: `Move "${groupsMap.get(selected.groupId)?.getLabel()}" to...`,
        placeHolder: 'Select new position'
      });

      if (newPosition) {
        // Remove from current position
        orderedIds.splice(selected.currentIndex, 1);
        // Insert at new position
        orderedIds.splice(newPosition.index, 0, selected.groupId);
      }
    }
  }
}

/**
 * Command to reorder all tabs using all OneTab groups without user selection
 */
export async function reorderAllTabsByGroupsCommand(): Promise<void> {
  await reorderTabsByOnetabGroups();
}
