// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import {
  blacklistFilter,
  getAllTabsWithBlackList,
  getLeftTabs,
  getOtherTabsWithBlacklist,
  getRightTabs,
  getSelectedTab,
  sendTabs,
} from "../utils/tab";
import { TabInputText } from "vscode";
import { TabsGroup } from "../model/tabsgroup";

export async function getNamedGroup(): Promise<TabsGroup | undefined | null> {
  const state = Global.tabsProvider.getState();
  let groups = state.getTitledLists();
  if (groups.length === 0) {
    return null;
  }

  let items: vscode.QuickPickItem[] = groups.map((group) => {
    return {
      label: group.label,
      description: group
        .getTabs()
        .map((tab) => tab.label)
        .join(","),
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

// TODO: fix blacklist logic
export async function advancedSendThisTab(uri: vscode.Uri) {
  let tab = getSelectedTab(uri);
  let filter = blacklistFilter();
  if (
    !tab ||
    !(tab.input instanceof TabInputText) ||
    filter(tab)
  ) {
    vscode.window.showWarningMessage("No selected tab");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    await sendTabs([tab], group.id);
  }
}

export async function advancedSendOtherTabs(uri: vscode.Uri) {
  let otherTabs = getOtherTabsWithBlacklist(uri);
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
    await sendTabs(otherTabs, group.id);
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
    await sendTabs(leftTabs, group.id);
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
    await sendTabs(rightTabs, group.id);
  }
}

export async function advancedSendAllTabs() {
  let allTabs = getAllTabsWithBlackList();
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
    await sendTabs(allTabs, group.id);
  }
}

export async function sendToBlackList(uri: vscode.Uri) {
  let conf = vscode.workspace.getConfiguration();
  let blacklist = conf.get("onetab.blacklist") as Array<string>;
  if (blacklist.includes(uri.path)) {
    vscode.window.showWarningMessage("Tab already in the blacklist");
    return;
  }
  if (blacklist) {
    blacklist.push(uri.path);
    vscode.workspace
      .getConfiguration()
      .update("onetab.blacklist", blacklist, false);
    Global.logger.debug(
      "blacklist:" + (blacklist as Array<string>).join(",\n\t")
    );
  } else {
    Global.logger.debug("No blacklist");
  }
}
