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

// Updated to support all saveable tab types
export function getAllTabsWithBlackList(): vscode.Tab[] | undefined {
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter(isSaveableTab)
    .filter(notInBlackList);
  return tabs.length === 0 ? undefined : tabs;
}

export function getAllTabsWithoutBlackList(): vscode.Tab[] | undefined {
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter(isSaveableTab);
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getOtherTabsWithBlacklist(uri: vscode.Uri): vscode.Tab[] | undefined {
  let currentTab = getActiveTab(uri);
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
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

export function getLeftTabs(uri: vscode.Uri): vscode.Tab[] | undefined {
  let currentTab = getActiveTab(uri);
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter(isSaveableTab);
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

export function getRightTabs(uri: vscode.Uri): vscode.Tab[] | undefined {
  let currentTab = getActiveTab(uri);
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter(isSaveableTab);
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const rightTabs = tabs.slice(currentIdx, tabs.length).filter(notInBlackList);
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
function getTabLabel(tab: vscode.Tab, info: { uri: vscode.Uri; originalUri?: vscode.Uri; tabType: TabType }): string {
  const baseLabel = getRelativeTabLabel(info.uri, tab.label);

  switch (info.tabType) {
    case 'diff':
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

    case 'notebookDiff':
      if (info.originalUri) {
        const originalName = path.basename(info.originalUri.fsPath);
        const modifiedName = path.basename(info.uri.fsPath);
        if (originalName === modifiedName) {
          return `📓 ${baseLabel} ↔ diff`;
        }
        return `📓 ${originalName} ↔ ${modifiedName}`;
      }
      return `📓 ${baseLabel} ↔ diff`;

    case 'notebook':
      return `📓 ${baseLabel}`;

    case 'custom':
      // Could be image, PDF, etc.
      return baseLabel;

    case 'text':
    default:
      return baseLabel;
  }
}

// Helper to get tab type and URIs
export function getTabInfo(tab: vscode.Tab): { uri: vscode.Uri; originalUri?: vscode.Uri; tabType: TabType } | undefined {
  const input = tab.input;

  if (input instanceof vscode.TabInputText) {
    return { uri: input.uri, tabType: 'text' };
  }
  if (input instanceof vscode.TabInputTextDiff) {
    return { uri: input.modified, originalUri: input.original, tabType: 'diff' };
  }
  if (input instanceof vscode.TabInputCustom) {
    return { uri: input.uri, tabType: 'custom' };
  }
  if (input instanceof vscode.TabInputNotebook) {
    return { uri: input.uri, tabType: 'notebook' };
  }
  if (input instanceof vscode.TabInputNotebookDiff) {
    return { uri: input.modified, originalUri: input.original, tabType: 'notebookDiff' };
  }

  return undefined;
}

// Update sendTabs to use the new label helper
export async function sendTabs(tabs: vscode.Tab[], groupId?: string, groupName?: string) {
  const tabItems = tabs
    .map((tab) => {
      const info = getTabInfo(tab);
      if (!info) return null;

      let item = new TabItem();
      item.setLabel(getTabLabel(tab, info));  // Use new label generator
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
    })
  } else {
    Global.tabsProvider.updateState((state) => {
      group = new TabsGroup();
      if (groupName) {
        group.setLabel(groupName);
      }
      group.setTabs(tabItems);
      state.addTabsGroup(group);
      updated = true;
    })
  }

  // check if state are updated
  if (updated) {
    listAllKeys();
    for (const tab of tabs.filter((tab) => !tab.isPinned)) {
      try {
        await vscode.window.tabGroups.close(tab);
      } catch (error) {
        console.error(`Failed to close tab: ${getTabUri(tab)?.toString()}`, error);
      }
    }
  }
}
