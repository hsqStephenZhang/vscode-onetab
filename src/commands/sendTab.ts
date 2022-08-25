// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import * as vscode from "vscode";
import { TabInputText } from "vscode";
import {
  getAllTabsWithBlackList,
  getAllTabsWithoutBlackList,
  getLeftTabs,
  getOtherTabsWithBlacklist,
  getRightTabs,
  getSelectedTab,
  sendTabs,
} from "../utils/tab";

export async function sendThisTab(uri: vscode.Uri) {
  let tab = getSelectedTab(uri);
  let blacklist = vscode.workspace
    .getConfiguration()
    .get("onetab.blacklist") as Array<string>;
  if (
    tab &&
    tab.input instanceof TabInputText &&
    blacklist.every((path) => {
      return (tab?.input as TabInputText).uri.path !== path;
    })
  ) {
    sendTabs([tab]);
  } else {
    vscode.window.showInformationMessage(
      "this is is not a text tab or in blacklist"
    );
  }
}

export async function sendOtherTabs(uri: vscode.Uri) {
  let otherTabs = getOtherTabsWithBlacklist(uri);
  if (otherTabs) {
    sendTabs(otherTabs);
  } else {
    vscode.window.showInformationMessage("No tabs to send");
  }
}

export async function sendLeftTabs(uri: vscode.Uri) {
  let leftTabs = getLeftTabs(uri);
  if (leftTabs) {
    sendTabs(leftTabs);
  } else {
    vscode.window.showInformationMessage("No tabs to send");
  }
}

export async function sendRightTabs(uri: vscode.Uri) {
  let rightTabs = getRightTabs(uri);
  if (rightTabs) {
    sendTabs(rightTabs);
  } else {
    vscode.window.showInformationMessage("No tabs to send");
  }
}

export async function sendAllTabs() {
  let allTabs = getAllTabsWithBlackList();
  if (allTabs) {
    sendTabs(allTabs);
  } else {
    vscode.window.showInformationMessage("No tabs to send");
  }
}