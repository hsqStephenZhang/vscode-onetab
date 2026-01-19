// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import { TabItem } from "../model/tabitem";
import { AccessTrackingService } from "../utils/accessTrackingService";

// Restore tab based on its type
async function openTabItem(tab: TabItem): Promise<void> {
  switch (tab.tabType) {
    case "diff":
      if (tab.originalUri) {
        // Open as diff view
        await vscode.commands.executeCommand(
          "vscode.diff",
          tab.originalUri,
          tab.fileUri,
          `${tab.getLabel()} (diff)`,
        );
      } else {
        // Fallback to regular file if original is missing
        await vscode.commands.executeCommand("vscode.open", tab.fileUri);
      }
      break;

    case "notebookDiff":
      if (tab.originalUri) {
        // Open as notebook diff (if supported)
        try {
          await vscode.commands.executeCommand(
            "vscode.diff",
            tab.originalUri,
            tab.fileUri,
            `${tab.getLabel()} (diff)`,
          );
        } catch {
          // Fallback to regular notebook
          await vscode.commands.executeCommand("vscode.open", tab.fileUri);
        }
      } else {
        await vscode.commands.executeCommand("vscode.open", tab.fileUri);
      }
      break;

    case "notebook":
    case "custom":
    case "text":
    default:
      // Use vscode.open for proper file type handling
      await vscode.commands.executeCommand("vscode.open", tab.fileUri);
      break;
  }
}

export async function tabRestore(tab: TabItem) {
  if (!tab.parentId) {
    return;
  }
  let groupId = tab.parentId;

  const state = Global.tabsProvider.getState();
  let g = state.getGroup(groupId);

  if (g) {
    await AccessTrackingService.recordAccess(groupId);
    if (g.isPinned()) {
      await openTabItem(tab);
      Global.tabsProvider.refresh();
    } else {
      await openTabItem(tab);
      Global.tabsProvider.updateState((state) => {
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
      });
    }
  }
}

export async function tabRestoreKeep(tab: TabItem) {
  if (!tab.parentId) {
    return;
  }
  let groupId = tab.parentId;

  const state = Global.tabsProvider.getState();
  let g = state.getGroup(groupId);

  if (g) {
    await AccessTrackingService.recordAccess(groupId);
    await openTabItem(tab);
    Global.tabsProvider.refresh();
  }
}

export async function tabRemove(tab: TabItem) {
  if (!tab.parentId) {
    return;
  }
  let groupId = tab.parentId;

  const state = Global.tabsProvider.getState();

  let g = state.getGroup(groupId);

  if (g) {
    await AccessTrackingService.recordAccess(groupId);
    if (g.isPinned()) {
      vscode.window.showWarningMessage(
        "this tab has been pinned within a group, please unpin the group first or right click and choose 'Force Remove' to remove it.",
      );
    } else {
      Global.tabsProvider.updateState((state) => {
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
      });
    }
  }
}

export async function tabForceRemove(tab: TabItem) {
  if (!tab.parentId) {
    return;
  }
  let groupId = tab.parentId;

  const state = Global.tabsProvider.getState();
  let g = state.getGroup(groupId);

  if (g) {
    const choice = await vscode.window.showWarningMessage(
      `Are you sure you want to remove "${tab.getLabel()}" from "${g.getLabel()}"?`,
      { modal: true },
      "Remove",
      "Cancel",
    );

    if (choice === "Remove") {
      await AccessTrackingService.recordAccess(groupId);
      Global.tabsProvider.updateState((state) => {
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
      });
    }
  }
}
