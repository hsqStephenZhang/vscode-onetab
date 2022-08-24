import { OnetabPanel } from "./../view/onetabPanel";
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { TabItem } from "../model/main/tabitem";
import { TabsState } from "../model/main/tabstate";
import {
  getAllTabs,
  getLeftTabs,
  getOtherTabs,
  getRightTabs,
  getSelectedTab,
  sendTabs,
} from "../utils/tab";
import { TabInputText } from "vscode";
import { TabsGroup } from "../model/main/tabsgroup";

export async function getNamedGroup(): Promise<TabsGroup | undefined | null> {
  const state = Object.assign(
    new TabsState(),
    WorkState.get("tabsState", new TabsState())
  );
  let groups = state.getTitledLists();
  if (groups.length === 0) {
    return null;
  }

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
    let index = items.findIndex((item) => item.label === r.label);
    if (index >= 0 && index < groups.length) {
      return groups[index];
    }
  }
  return undefined;
}

export async function advancedSendThisTab(uri: vscode.Uri) {
  let tab = getSelectedTab(uri);
  if (!tab || !(tab.input instanceof TabInputText)) {
    vscode.window.showWarningMessage("No selected tab");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    sendTabs([tab], group.id);
  }
}

export async function advancedSendOtherTabs(uri: vscode.Uri) {
  let otherTabs = getOtherTabs(uri);
  if (!otherTabs) {
    vscode.window.showWarningMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    sendTabs(otherTabs, group.id);
  }
}

export async function advancedSendLeftTabs(uri: vscode.Uri) {
  let leftTabs = getLeftTabs(uri);
  if (!leftTabs) {
    vscode.window.showInformationMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    sendTabs(leftTabs, group.id);
  }
}

export async function advancedSendRightTabs(uri: vscode.Uri) {
  let rightTabs = getRightTabs(uri);
  if (!rightTabs) {
    vscode.window.showInformationMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    sendTabs(rightTabs, group.id);
  }
}

export async function advancedSendAllTabs() {
  let allTabs = getAllTabs();
  if (!allTabs) {
    vscode.window.showInformationMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    sendTabs(allTabs, group.id);
  }
}

export async function sendToBlackList() {
  vscode.window.showInformationMessage("todo");
}

export async function searchTab(uri: vscode.Uri) {
  OnetabPanel.postMessage(uri, {
    cmd: "search",
    data: "",
  });
}
