// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import { TabsGroup } from "../model/tabsgroup";
import { TabItem } from "../model/tabitem";
import { AccessTrackingService } from "../utils/accessTrackingService";

// Add the openTabItem helper or import it
async function openTabItem(tab: TabItem): Promise<void> {
  switch (tab.tabType) {
    case 'diff':
      if (tab.originalUri) {
        await vscode.commands.executeCommand(
          'vscode.diff',
          tab.originalUri,
          tab.fileUri,
          `${tab.getLabel()} (diff)`
        );
      } else {
        await vscode.commands.executeCommand('vscode.open', tab.fileUri);
      }
      break;
      
    case 'notebookDiff':
      if (tab.originalUri) {
        try {
          await vscode.commands.executeCommand('vscode.diff', tab.originalUri, tab.fileUri);
        } catch {
          await vscode.commands.executeCommand('vscode.open', tab.fileUri);
        }
      } else {
        await vscode.commands.executeCommand('vscode.open', tab.fileUri);
      }
      break;
      
    default:
      await vscode.commands.executeCommand('vscode.open', tab.fileUri);
      break;
  }
}

export async function tabsGroupRestore(tabsGroup: TabsGroup) {
  if (!tabsGroup.id) {
    return;
  }
  await AccessTrackingService.recordAccess(tabsGroup.id);
  for (const tab of tabsGroup.getTabs()) {
    await openTabItem(tab);
  }
  if (!tabsGroup.isPinned()) {
    removeInner(tabsGroup.id);
  }
}

export async function tabsGroupTags(group: TabsGroup) {
  if (!group.id) {
    return;
  }
  const id = group.id;
  const state = Global.tabsProvider.getState();
  
  // Collect all existing tags from all groups
  const existingTags = new Set<string>();
  for (const [, g] of state.groups) {
    for (const tag of g.getTags()) {
      existingTags.add(tag);
    }
  }
  
  const currentTags = new Set(group.getTags());
  
  // Create QuickPick items
  const baseItems: vscode.QuickPickItem[] = Array.from(existingTags).map(tag => ({
    label: tag,
    description: currentTags.has(tag) ? '(current)' : undefined,
  }));
  
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = baseItems;
  quickPick.canSelectMany = true;
  quickPick.placeholder = 'Select existing tags or type to add new ones';
  quickPick.selectedItems = baseItems.filter(item => currentTags.has(item.label));
  
  // Track dynamically added items
  let dynamicItems: vscode.QuickPickItem[] = [];
  
  // Allow adding new tags as user types
  quickPick.onDidChangeValue(value => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) {
      // Reset to base items when input is cleared
      quickPick.items = baseItems;
      dynamicItems = [];
      return;
    }
    
    // Parse input - support comma-separated or single tag
    const inputTags = trimmedValue.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    // Find truly new tags (not in existing tags)
    const newTags = inputTags.filter(t => !existingTags.has(t));
    
    if (newTags.length > 0) {
      // Create a SINGLE item that matches the current input value
      // This ensures it won't be filtered out by QuickPick
      dynamicItems = [{
        label: trimmedValue,  // Use the raw input so it matches the filter
        description: `(new: ${newTags.join(', ')} - press Enter to add)`,
        alwaysShow: true,  // Force show even if it doesn't match filter
      }];
    } else {
      dynamicItems = [];
    }
    
    // Preserve current selection
    const currentSelection = quickPick.selectedItems;
    
    // Update items: base items + new dynamic items
    quickPick.items = [...baseItems, ...dynamicItems];
    
    // Restore selection
    quickPick.selectedItems = quickPick.items.filter(item => 
      currentSelection.some(sel => sel.label === item.label)
    );
  });
  
  quickPick.onDidAccept(async () => {
    const finalTags = new Set<string>();
    
    // Add selected items (but parse them if they contain commas)
    for (const item of quickPick.selectedItems) {
      // Check if this is a "new tags" item (contains comma)
      if (item.label.includes(',')) {
        // Parse the comma-separated tags
        const parsed = item.label.split(',').map(t => t.trim()).filter(t => t.length > 0);
        parsed.forEach(tag => finalTags.add(tag));
      } else {
        finalTags.add(item.label);
      }
    }
    
    // Also add any typed tags that aren't selected yet
    const inputValue = quickPick.value.trim();
    if (inputValue) {
      const typedTags = inputValue.split(',').map(t => t.trim()).filter(t => t.length > 0);
      typedTags.forEach(tag => finalTags.add(tag));
    }
    
    await AccessTrackingService.recordAccess(id);
    Global.tabsProvider.updateState((state) => {
      state.setGroupTags(id, Array.from(finalTags));
    });
    quickPick.hide();
  });
  
  quickPick.onDidHide(() => quickPick.dispose());
  
  quickPick.show();
}

export async function tabsGroupRename(group: TabsGroup) {
  if (!group.id) {
    return;
  }
  const id = group.id;
  const newName = await vscode.window.showInputBox({
    prompt: "New name",
    value: group.getLabel(),
  });
  if (newName) {
    await AccessTrackingService.recordAccess(id);
    Global.tabsProvider.updateState((state) => {
      state.setGroupLabel(id, newName);
    })
  }
}

export async function tabsGroupPin(group: TabsGroup) {
  if (!group.id) {
    return;
  }
  let id = group.id;
  await AccessTrackingService.recordAccess(id);
  Global.tabsProvider.updateState((state) => {
    state.setPinned(id, !group.isPinned())
  })
}

export async function tabsGroupRemove(group: TabsGroup) {
  if (!group.id) {
    return;
  }
  if (group.isPinned() === true) {
    vscode.window.showWarningMessage("Cannot remove pinned group");
    return;
  }

  const choice = await vscode.window.showInputBox({
    title:
      "Are you sure to remove this group? Please input 'y/yes' to confirm, 'n' to cancel",
  });
  if (
    choice &&
    (choice.toLowerCase() === "y" || choice.toLowerCase() === "yes")
  ) {
    removeInner(group.id);
  } else {
    vscode.window.showInformationMessage("cancel remove tabs group");
  }
}

function removeInner(id: string) {
  Global.tabsProvider.updateState((state) => {
    state.removeTabsGroup(id);
  })
}
