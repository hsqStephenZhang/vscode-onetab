// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { TabItem } from "../model/main/tabitem";
import { TabsState } from "../model/main/tabstate";
import * as vscode from "vscode";
import { STORAGE_KEY } from "../constant";

export async function tabRestore(tab: TabItem) {
  let groupId = tab.parent?.getId();

  if (groupId) {
    const state = Object.assign(
      new TabsState(),
      WorkState.get(STORAGE_KEY, new TabsState())
    );

    let g = state.getGroup(groupId);

    if (g) {
      if (g.isPinned()) {
        vscode.window.showTextDocument(tab.fileUri, { preview: false });
        Global.tabsProvider.refresh();
      } else {
        vscode.window.showTextDocument(tab.fileUri, { preview: false });
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
        WorkState.update(STORAGE_KEY, state);
        Global.tabsProvider.refresh();
      }
    }
  }
}

export async function tabRemove(tab: TabItem) {
  let groupId = tab.parent?.getId();

  if (groupId) {
    const state = Object.assign(
      new TabsState(),
      WorkState.get(STORAGE_KEY, new TabsState())
    );

    let g = state.getGroup(groupId);

    if (g) {
      if (g.isPinned()) {
        vscode.window.showWarningMessage(
          "this tab has been pinned within a group, please unpin the group before removing this tab"
        );
      } else {
        state.removeTabFromGroup(groupId, tab.fileUri.fsPath);
        WorkState.update(STORAGE_KEY, state);
        Global.tabsProvider.refresh();
      }
    }
  }
}
