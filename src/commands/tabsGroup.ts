// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { TabsGroup } from "../model/main/tabsgroup";
import { TabsState } from "../model/main/tabstate";

export async function tabsGroupRestore(tabsGroup: TabsGroup) {
  for (const tab of tabsGroup.tabs) {
    const fileUri = tab.fileUri;
    vscode.window.showTextDocument(fileUri, { preview: false });
  }
  if (!tabsGroup.pinned) {
    vscode.commands.executeCommand("onetab.tabsGroup.remove", tabsGroup);
  }
}

export async function tabsGroupRename(group: TabsGroup) {
  const newName = await vscode.window.showInputBox({
    prompt: "New name",
    value: group.label,
  });
  if (newName) {
    const state = Object.assign(
      new TabsState(),
      WorkState.get("tabsState", new TabsState())
    );
    state.setLabelToGroup(group.id, newName);
    WorkState.update("tabsState", state);
    Global.tabsProvider.refresh();
  }
}

export async function tabsGroupPin(group: TabsGroup) {
  const state = Object.assign(
    new TabsState(),
    WorkState.get("tabsState", new TabsState())
  );
  state.setPinned(group.id, !group.pinned);
  WorkState.update("tabsState", state);
  Global.tabsProvider.refresh();
}

export async function tabsGroupRemove(group: TabsGroup) {
  const state = Object.assign(
    new TabsState(),
    WorkState.get("tabsState", new TabsState())
  );
  state.removeTabsGroup(group.id);
  WorkState.update("tabsState", state);
  Global.tabsProvider.refresh();
}
