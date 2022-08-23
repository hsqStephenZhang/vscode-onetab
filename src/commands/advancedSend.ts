import { Global } from "./../common/global";
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { WorkState } from "../common/state";
import { TabItem } from "../model/main/tabitem";
import { TabsState } from "../model/main/tabstate";

export async function sendTabToNamedGroup() {
  let tab = vscode.window.tabGroups.activeTabGroup.activeTab as vscode.Tab;
  const state = Object.assign(
    new TabsState(),
    WorkState.get("tabsState", new TabsState())
  );
  let groups = state.getTitledLists();
  let items: vscode.QuickPickItem[] = groups.map((group) => {
    return {
      label: group.label,
      description: group.label,
    };
  });
  let choice = await vscode.window.showQuickPick(items, {
    matchOnDescription: true,
  });

  if (choice) {
    let r = choice;
    // todo: label may not be unique, try other unique identifier
    let index = items.findIndex((item) => item.label === r.label);
    if (index >= 0 && index < groups.length) {
      let group = groups[index];
      let tabs = [tab];
      const tabItems = tabs.map((tab) => {
        // safety: already filter tabs, so tab.input are all TabInputText now
        let textFile = tab.input as vscode.TabInputText;
        return new TabItem(tab.label, textFile.uri);
      });
      state.addTabsToGroup(group.id, tabItems);
      WorkState.update("tabsState", state);
      vscode.window.tabGroups.close(tab);
      Global.tabsProvider.refresh();
    } else {
      vscode.window.showErrorMessage("Inner error");
    }
  } else {
    vscode.window.showWarningMessage("No group selected");
  }
}
