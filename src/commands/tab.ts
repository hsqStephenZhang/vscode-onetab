// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { TabItem } from "../model/main/tabitem";

export async function tabRestore(tab: TabItem) {
  if (!tab.parentId) {
    return;
  }
  let groupId = tab.parentId;

  const state = Global.tabsProvider.getState();

  let g = state.getGroup(groupId);

  if (g) {
    if (g.isPinned()) {
      vscode.window.showTextDocument(tab.fileUri, { preview: false });
      Global.tabsProvider.refresh();
    } else {
      vscode.window.showTextDocument(tab.fileUri, { preview: false });
      Global.tabsProvider.updateState((state) => {
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
      })
    }
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
    if (g.isPinned()) {
      vscode.window.showWarningMessage(
        "this tab has been pinned within a group, please unpin the group before removing this tab"
      );
    } else {
      Global.tabsProvider.updateState((state) => {
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
      })
    }
  }
}
