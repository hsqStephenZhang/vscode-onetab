// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import { TabItem, TabType } from "../model/tabitem";
import { TabsGroup } from "../model/tabsgroup";
import { listAllKeys } from "./debug";
import * as path from "path";
import { blacklistService } from "./blacklistService";

// Helper type for tabs that have a URI we can save
type SupportedTabInput =
  | vscode.TabInputText
  | vscode.TabInputTextDiff
  | vscode.TabInputCustom
  | vscode.TabInputNotebook
  | vscode.TabInputNotebookDiff;

// Extract URI from different tab input types
export function getTabUri(tab: vscode.Tab): vscode.Uri | undefined {
  const input = tab.input;

  if (input instanceof vscode.TabInputText) {
    return input.uri;
  }
  if (input instanceof vscode.TabInputTextDiff) {
    // Use the modified (right-side) URI for diffs
    return input.modified;
  }
  if (input instanceof vscode.TabInputCustom) {
    return input.uri;
  }
  if (input instanceof vscode.TabInputNotebook) {
    return input.uri;
  }
  if (input instanceof vscode.TabInputNotebookDiff) {
    return input.modified;
  }
  // TabInputWebview and TabInputTerminal don't have URIs we can restore
  return undefined;
}

// Check if a tab has a saveable URI
export function isSaveableTab(tab: vscode.Tab): boolean {
  return getTabUri(tab) !== undefined;
}

// Replace tabIsTextInput with a more generic version
export function tabIsTextInput(tab: vscode.Tab): boolean {
  return tab.input instanceof vscode.TabInputText;
}

// New: Check if tab is any supported type
export function tabIsSaveable(tab: vscode.Tab): boolean {
  return isSaveableTab(tab);
}

// Updated notInBlackList to work with any saveable tab
export function notInBlackList(tab: vscode.Tab): boolean {
  const uri = getTabUri(tab);
  if (!uri) return false;

  // Use the cached blacklist service
  return !blacklistService.isBlacklisted(uri);
}

/**
 * Prompts user to select which VSCode tab groups to include
 * Returns selected tab groups or undefined if cancelled
 */
export async function selectTabGroups(): Promise<
  readonly vscode.TabGroup[] | undefined
> {
  const allTabGroups = vscode.window.tabGroups.all;

  if (allTabGroups.length === 0) {
    return undefined;
  }

  if (allTabGroups.length === 1) {
    // Only one group, return it directly
    return allTabGroups;
  }

  // Create quick pick items for each tab group
  const quickPickItems = allTabGroups.map((group, index) => {
    const tabCount = group.tabs.length;
    const activeTab = group.activeTab;
    const label = activeTab?.label || `Group ${index + 1}`;

    return {
      label: `${index + 1}: ${label}`,
      description: `${tabCount} tab${tabCount !== 1 ? "s" : ""}`,
      detail: group.isActive ? "(Active)" : undefined,
      group: group,
      picked: true, // Pre-select all groups by default
    };
  });

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    canPickMany: true,
    placeHolder:
      "Select tab groups to include (ESC to cancel, Enter to use all selected)",
    title: "Select Tab Groups",
  });

  if (!selected || selected.length === 0) {
    return undefined;
  }

  return selected.map((item) => item.group);
}

/**
 * Get tabs from specified tab groups or all tab groups
 */
function getTabsFromGroups(tabGroups?: vscode.TabGroup[]): vscode.Tab[] {
  const groups = tabGroups || vscode.window.tabGroups.all;
  return groups.map((group) => group.tabs).flat(1);
}

// Updated to support all saveable tab types
export function getAllTabsWithBlackList(
  tabGroups?: vscode.TabGroup[],
): vscode.Tab[] | undefined {
  const tabs = getTabsFromGroups(tabGroups)
    .filter(isSaveableTab)
    .filter(notInBlackList);
  return tabs.length === 0 ? undefined : tabs;
}

export function getAllTabsWithoutBlackList(
  tabGroups?: vscode.TabGroup[],
): vscode.Tab[] | undefined {
  const tabs = getTabsFromGroups(tabGroups).filter(isSaveableTab);
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getOtherTabsWithBlacklist(
  uri: vscode.Uri,
  tabGroups?: vscode.TabGroup[],
): vscode.Tab[] | undefined {
  let currentTab = getActiveTab(uri);
  const tabs = getTabsFromGroups(tabGroups)
    .filter((tab) => {
      return tab !== currentTab && isSaveableTab(tab);
    })
    .filter(notInBlackList);
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getLeftTabs(
  uri: vscode.Uri,
  tabGroups?: vscode.TabGroup[],
): vscode.Tab[] | undefined {
  let currentTab = getActiveTab(uri);
  const tabs = getTabsFromGroups(tabGroups).filter(isSaveableTab);
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const leftTabs = tabs.slice(0, currentIdx + 1).filter(notInBlackList);
    if (leftTabs.length === 0) {
      return undefined;
    } else {
      return leftTabs;
    }
  } else {
    return undefined;
  }
}

export function getRightTabs(
  uri: vscode.Uri,
  tabGroups?: vscode.TabGroup[],
): vscode.Tab[] | undefined {
  let currentTab = getActiveTab(uri);
  const tabs = getTabsFromGroups(tabGroups).filter(isSaveableTab);
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const rightTabs = tabs
      .slice(currentIdx, tabs.length)
      .filter(notInBlackList);
    if (rightTabs.length === 0) {
      return undefined;
    } else {
      return rightTabs;
    }
  } else {
    return undefined;
  }
}

// safety: getCurrentTab will only be called when at least one tab is opened
export function getActive(): vscode.Tab {
  return vscode.window.tabGroups.activeTabGroup.activeTab as vscode.Tab;
}

export function getActiveTab(uri: vscode.Uri): vscode.Tab | undefined {
  const allTabs = getAllTabsWithoutBlackList();
  if (allTabs) {
    const tab = allTabs.find((tab) => {
      const tabUri = getTabUri(tab);
      return tabUri && tabUri.path === uri.path;
    });
    if (tab) {
      return tab;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

function getLabelBaseFolder(uri: vscode.Uri): string | undefined {
  // Prefer the workspace folder that contains the file (if any),
  // otherwise fall back to the "active" workspace folder,
  // otherwise fall back to the first workspace folder.
  const containing = vscode.workspace.getWorkspaceFolder(uri);
  if (containing) return containing.uri.fsPath;

  const activeEditorUri = vscode.window.activeTextEditor?.document?.uri;
  if (activeEditorUri) {
    const activeWs = vscode.workspace.getWorkspaceFolder(activeEditorUri);
    if (activeWs) return activeWs.uri.fsPath;
  }

  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getRelativeTabLabel(uri: vscode.Uri, fallbackLabel?: string): string {
  // Only file URIs have stable fsPath semantics.
  if (uri.scheme === "file") {
    const base = getLabelBaseFolder(uri);
    if (base) {
      // This will yield things like "../proj2/readme.md" when outside base.
      let rel = path.relative(base, uri.fsPath);

      // Ensure it doesn't become an empty string (e.g., base == file path)
      if (!rel) rel = path.basename(uri.fsPath);

      // Normalize for display (VS Code labels commonly use forward slashes)
      return rel.split(path.sep).join("/");
    }

    // No workspace at all—fall back to basename rather than an absolute path label.
    return path.basename(uri.fsPath);
  }

  // Non-file schemes (untitled, vscode-remote, etc.)
  return fallbackLabel ?? uri.path.split("/").filter(Boolean).pop() ?? "";
}

// Generate descriptive label based on tab type
function getTabLabel(
  tab: vscode.Tab,
  info: { uri: vscode.Uri; originalUri?: vscode.Uri; tabType: TabType },
): string {
  const baseLabel = getRelativeTabLabel(info.uri, tab.label);

  switch (info.tabType) {
    case "diff":
      if (info.originalUri) {
        const originalName = path.basename(info.originalUri.fsPath);
        const modifiedName = path.basename(info.uri.fsPath);
        // If same filename, show as "file.ts (diff)"
        if (originalName === modifiedName) {
          return `${baseLabel} ↔ diff`;
        }
        // Different files: "original.ts ↔ modified.ts"
        return `${originalName} ↔ ${modifiedName}`;
      }
      return `${baseLabel} ↔ diff`;

    case "notebookDiff":
      if (info.originalUri) {
        const originalName = path.basename(info.originalUri.fsPath);
        const modifiedName = path.basename(info.uri.fsPath);
        if (originalName === modifiedName) {
          return `📓 ${baseLabel} ↔ diff`;
        }
        return `📓 ${originalName} ↔ ${modifiedName}`;
      }
      return `📓 ${baseLabel} ↔ diff`;

    case "notebook":
      return `📓 ${baseLabel}`;

    case "custom":
      // Could be image, PDF, etc.
      return baseLabel;

    case "text":
    default:
      return baseLabel;
  }
}

// Helper to get tab type and URIs
export function getTabInfo(
  tab: vscode.Tab,
): { uri: vscode.Uri; originalUri?: vscode.Uri; tabType: TabType } | undefined {
  const input = tab.input;

  if (input instanceof vscode.TabInputText) {
    return { uri: input.uri, tabType: "text" };
  }
  if (input instanceof vscode.TabInputTextDiff) {
    return {
      uri: input.modified,
      originalUri: input.original,
      tabType: "diff",
    };
  }
  if (input instanceof vscode.TabInputCustom) {
    return { uri: input.uri, tabType: "custom" };
  }
  if (input instanceof vscode.TabInputNotebook) {
    return { uri: input.uri, tabType: "notebook" };
  }
  if (input instanceof vscode.TabInputNotebookDiff) {
    return {
      uri: input.modified,
      originalUri: input.original,
      tabType: "notebookDiff",
    };
  }

  return undefined;
}

// Update sendTabs to use the new label helper
export async function sendTabs(
  tabs: vscode.Tab[],
  groupId?: string,
  groupName?: string,
) {
  const tabItems = tabs
    .map((tab) => {
      const info = getTabInfo(tab);
      if (!info) return null;

      let item = new TabItem();
      item.setLabel(getTabLabel(tab, info)); // Use new label generator
      item.setFileUri(info.uri);
      item.setTabType(info.tabType);

      if (info.originalUri) {
        item.setOriginalUri(info.originalUri);
      }

      item.parentId = groupId;
      return item;
    })
    .filter((item): item is TabItem => item !== null);
  let updated = false;
  let group = null;

  if (groupId) {
    Global.tabsProvider.updateState((state) => {
      group = state.getGroup(groupId);
      if (group) {
        state.addTabsToGroup(groupId, tabItems);
        updated = true;
      }
    });
  } else {
    Global.tabsProvider.updateState((state) => {
      group = new TabsGroup();
      if (groupName) {
        group.setLabel(groupName);
      }
      group.setTabs(tabItems);
      state.addTabsGroup(group);
      updated = true;
    });
  }

  // check if state are updated
  if (updated) {
    listAllKeys();
    const tabsToClose = tabs.filter((tab) => !tab.isPinned);
    // Close tabs in reverse order to avoid index shifting issues
    // Or close them all at once using the close method with array
    if (tabsToClose.length > 0) {
      try {
        // Try to close all tabs at once - this is more reliable for multiple tabs
        await vscode.window.tabGroups.close(tabsToClose);
      } catch (error) {
        // If batch close fails, fall back to closing one by one
        console.error("Batch close failed, trying individual close:", error);
        for (const tab of tabsToClose) {
          try {
            await vscode.window.tabGroups.close(tab);
          } catch (err) {
            console.error(
              `Failed to close tab: ${getTabUri(tab)?.toString()}`,
              err,
            );
          }
        }
      }
    }
  }
}

/**
 * Reorder currently open tabs based on which OneTab TabsGroup they belong to
 * This organizes the editor to match your saved OneTab groups
 * @param selectedGroupIds Optional array of OneTab group IDs to use for organizing. Order matters - tabs will be organized in this group order.
 */
export async function reorderTabsByOnetabGroups(
  selectedGroupIds?: string[],
): Promise<void> {
  // Get all currently open tabs across all editor groups
  const allVSCodeTabGroups = vscode.window.tabGroups.all;

  if (allVSCodeTabGroups.length === 0) {
    vscode.window.showInformationMessage("No tabs are currently open");
    return;
  }

  // Get OneTab groups to use for organizing, preserving order
  const onetabGroupsInOrder: Array<{
    id: string;
    label: string;
    tabs: Array<{ uri: string }>;
  }> = [];
  const onetabGroupsMap = new Map<string, number>(); // Maps groupId to order index

  Global.tabsProvider.updateState((state) => {
    const groupsToUse = selectedGroupIds
      ? (selectedGroupIds
          .map((id) => state.groups.get(id))
          .filter((g) => g !== undefined) as TabsGroup[])
      : Array.from(state.groups.values());

    groupsToUse.forEach((group, index) => {
      const groupData = {
        id: group.id!,
        label: group.getLabel(),
        tabs: group.tabs.map((t) => ({ uri: t.fileUri.toString() })),
      };
      onetabGroupsInOrder.push(groupData);
      onetabGroupsMap.set(group.id!, index);
    });
  });

  if (onetabGroupsInOrder.length === 0) {
    vscode.window.showInformationMessage("No OneTab groups to organize by");
    return;
  }

  // Process each VS Code editor group (split view) separately
  for (const vscodeTabGroup of allVSCodeTabGroups) {
    const currentTabs = [...vscodeTabGroup.tabs];

    if (currentTabs.length === 0) {
      continue;
    }

    // Categorize tabs by which OneTab group they belong to
    interface CategorizedTab {
      tab: vscode.Tab;
      uri: string;
      isPinned: boolean;
      isActive: boolean;
      onetabGroupId?: string;
      onetabGroupLabel?: string;
      onetabGroupOrder: number; // Order index for sorting
    }

    const categorizedTabs: CategorizedTab[] = [];
    const activeTab = vscodeTabGroup.activeTab;

    for (const tab of currentTabs) {
      const tabUri = getTabUri(tab);
      if (!tabUri) {
        continue;
      }

      const uriString = tabUri.toString();
      let foundGroupId: string | undefined;
      let foundGroupLabel: string | undefined;
      let foundGroupOrder = Number.MAX_SAFE_INTEGER;

      // Check which OneTab group this tab belongs to
      for (const groupData of onetabGroupsInOrder) {
        if (groupData.tabs.some((t) => t.uri === uriString)) {
          foundGroupId = groupData.id;
          foundGroupLabel = groupData.label;
          foundGroupOrder =
            onetabGroupsMap.get(groupData.id) ?? Number.MAX_SAFE_INTEGER;
          break;
        }
      }

      categorizedTabs.push({
        tab,
        uri: uriString,
        isPinned: tab.isPinned,
        isActive: tab === activeTab,
        onetabGroupId: foundGroupId,
        onetabGroupLabel: foundGroupLabel,
        onetabGroupOrder: foundGroupOrder,
      });
    }

    // Organize tabs: pinned grouped, pinned ungrouped, unpinned grouped, unpinned ungrouped
    const pinnedGrouped = categorizedTabs.filter(
      (t) => t.isPinned && t.onetabGroupId,
    );
    const pinnedUngrouped = categorizedTabs.filter(
      (t) => t.isPinned && !t.onetabGroupId,
    );
    const unpinnedGrouped = categorizedTabs.filter(
      (t) => !t.isPinned && t.onetabGroupId,
    );
    const unpinnedUngrouped = categorizedTabs.filter(
      (t) => !t.isPinned && !t.onetabGroupId,
    );

    // Sort grouped tabs by their OneTab group order (user-specified)
    pinnedGrouped.sort((a, b) => a.onetabGroupOrder - b.onetabGroupOrder);
    unpinnedGrouped.sort((a, b) => a.onetabGroupOrder - b.onetabGroupOrder);

    // Build the final order
    const reorderedTabs = [
      ...pinnedGrouped,
      ...pinnedUngrouped,
      ...unpinnedGrouped,
      ...unpinnedUngrouped,
    ];

    // Find which tab should be active after reordering
    const activeTabIndex = reorderedTabs.findIndex((t) => t.isActive);

    // Close ALL tabs (we'll reopen them in the correct order)
    // This is necessary because VS Code doesn't have an API to move tabs
    await vscode.window.tabGroups.close(currentTabs, true);

    // Reopen all tabs in the desired order
    for (let i = 0; i < reorderedTabs.length; i++) {
      const catTab = reorderedTabs[i];
      const tabInfo = getTabInfo(catTab.tab);
      if (!tabInfo) {
        continue;
      }

      try {
        // Open the tab
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.parse(catTab.uri),
        );
        await vscode.window.showTextDocument(doc, {
          viewColumn: vscodeTabGroup.viewColumn,
          preview: false,
          preserveFocus: i !== activeTabIndex,
        });

        // Re-pin if it was pinned
        if (catTab.isPinned) {
          await vscode.commands.executeCommand("workbench.action.pinEditor");
        }
      } catch (error) {
        console.error(`Failed to reopen tab: ${catTab.uri}`, error);
      }
    }

    // Ensure the originally active tab is focused
    if (activeTabIndex >= 0 && activeTabIndex < reorderedTabs.length) {
      const activeTabData = reorderedTabs[activeTabIndex];
      if (activeTabData) {
        try {
          const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.parse(activeTabData.uri),
          );
          await vscode.window.showTextDocument(doc, {
            viewColumn: vscodeTabGroup.viewColumn,
            preserveFocus: false,
          });
        } catch (error) {
          console.error(`Failed to activate tab: ${activeTabData.uri}`, error);
        }
      }
    }
  }

  const groupCount = onetabGroupsInOrder.length;
  vscode.window.showInformationMessage(
    `Tabs organized by ${groupCount} OneTab group${groupCount !== 1 ? "s" : ""}. ` +
      `Order: pinned (grouped → ungrouped) → unpinned (grouped → ungrouped)`,
  );
}
