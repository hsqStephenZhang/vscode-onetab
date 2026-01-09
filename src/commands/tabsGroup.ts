// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import { TabsGroup } from "../model/tabsgroup";

export async function tabsGroupRestore(tabsGroup: TabsGroup) {
  if (!tabsGroup.id) {
    return;
  }
  for (const tab of tabsGroup.getTabs()) {
    const fileUri = tab.fileUri;
    vscode.window.showTextDocument(fileUri, { preview: false });
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
  const tagsRaw = group.getTags().join(",");
  const newTagsRaw = await vscode.window.showInputBox({
    prompt: "New Tags, separated by comma",
    value: tagsRaw,
  });
  if (newTagsRaw) {
    Global.tabsProvider.updateState((state) => {
      const newTags = newTagsRaw.split(",").map((tag) => tag.trim());
      state.setGroupTags(id, newTags);
    })
  }
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
