// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import * as vscode from "vscode";
import {
  notInBlackList,
  getAllTabsWithBlackList,
  getLeftTabs,
  getOtherTabsWithBlacklist,
  getRightTabs,
  getActiveTab,
  sendTabs,
  isSaveableTab,
  getTabUri,
} from "../utils/tab";

export async function sendThisTab(uri: vscode.Uri) {
  let tab = getActiveTab(uri);
  if (
    tab &&
    isSaveableTab(tab) &&
    notInBlackList(tab)
  ) {
    await sendTabs([tab]);
  } else {
    vscode.window.showWarningMessage(
      "This tab cannot be saved (not a file-based tab or in blacklist)"
    );
  }
}

export async function sendOtherTabs(uri: vscode.Uri) {
  let otherTabs = getOtherTabsWithBlacklist(uri);
  if (otherTabs) {
    await sendTabs(otherTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}

export async function sendLeftTabs(uri: vscode.Uri) {
  let leftTabs = getLeftTabs(uri);
  if (leftTabs) {
    await sendTabs(leftTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}

export async function sendRightTabs(uri: vscode.Uri) {
  let rightTabs = getRightTabs(uri);
  if (rightTabs) {
    await sendTabs(rightTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}

export async function sendAllTabs() {
  let allTabs = getAllTabsWithBlackList();
  if (allTabs) {
    await sendTabs(allTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}