// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";
import { TabsGroup } from "../model/main/tabsgroup";
import { TabsState } from "../model/main/tabstate";

export async function tabsGroupRestore(tabsGroup: TabsGroup) {
  for (const tab of tabsGroup.getTabs()) {
    const fileUri = tab.fileUri;
    vscode.window.showTextDocument(fileUri, { preview: false });
  }
  if (!tabsGroup.isPinned()) {
    removeInner(tabsGroup.id);
  }
}

export async function tabsGroupTags(group: TabsGroup) {
  const tagsRaw = group.getTags().join(",");
  const newTagsRaw = await vscode.window.showInputBox({
    prompt: "New Tags, separated by comma",
    value: tagsRaw,
  });
  if (newTagsRaw) {
    const newTags = newTagsRaw.split(",").map((tag) => tag.trim());
    const state = Object.assign(
      new TabsState(),
      WorkState.get(STORAGE_KEY, new TabsState())
    );
    state.setGroupTags(group.id, newTags);
    WorkState.update(STORAGE_KEY, state);
    Global.tabsProvider.refresh();
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
      WorkState.get(STORAGE_KEY, new TabsState())
    );
    state.setGroupLabel(group.id, newName);
    WorkState.update(STORAGE_KEY, state);
    Global.tabsProvider.refresh();
  }
}

export async function tabsGroupPin(group: TabsGroup) {
  const state = Object.assign(
    new TabsState(),
    WorkState.get(STORAGE_KEY, new TabsState())
  );
  state.setPinned(group.id, !group.isPinned());
  WorkState.update(STORAGE_KEY, state);
  Global.tabsProvider.refresh();
}

export async function tabsGroupRemove(group: TabsGroup) {
  if (group.isPinned() === true) {
    vscode.window.showWarningMessage("Cannot remove pinned group");
    return;
  }

  const choice = await vscode.window.showInputBox({
    title:
      "Are you sure to remove this group? Please input 'y' to confirm, 'n' to cancel",
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
  const state = Object.assign(
    new TabsState(),
    WorkState.get(STORAGE_KEY, new TabsState())
  );
  state.removeTabsGroup(id);
  WorkState.update(STORAGE_KEY, state);
  Global.tabsProvider.refresh();
}
