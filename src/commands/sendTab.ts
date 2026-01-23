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
  selectTabGroups,
} from "../utils/tab";

export async function sendThisTab(uri: vscode.Uri) {
  let tab = getActiveTab(uri);
  if (tab && isSaveableTab(tab) && notInBlackList(tab)) {
    await sendTabs([tab]);
  } else {
    vscode.window.showWarningMessage(
      "This tab cannot be saved (not a file-based tab or in blacklist)",
    );
  }
}

export async function sendOtherTabs(uri: vscode.Uri) {
  const selectedGroups = await selectTabGroups();
  if (selectedGroups === undefined) {
    return; // User cancelled
  }

  let otherTabs = getOtherTabsWithBlacklist(uri, [...selectedGroups]);
  if (otherTabs) {
    await sendTabs(otherTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}

export async function sendLeftTabs(uri: vscode.Uri) {
  const selectedGroups = await selectTabGroups();
  if (selectedGroups === undefined) {
    return; // User cancelled
  }

  let leftTabs = getLeftTabs(uri, [...selectedGroups]);
  if (leftTabs) {
    await sendTabs(leftTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}

export async function sendRightTabs(uri: vscode.Uri) {
  const selectedGroups = await selectTabGroups();
  if (selectedGroups === undefined) {
    return; // User cancelled
  }

  let rightTabs = getRightTabs(uri, [...selectedGroups]);
  if (rightTabs) {
    await sendTabs(rightTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}

export async function sendAllTabs() {
  const selectedGroups = await selectTabGroups();
  if (selectedGroups === undefined) {
    return; // User cancelled
  }

  let allTabs = getAllTabsWithBlackList([...selectedGroups]);
  if (allTabs) {
    await sendTabs(allTabs);
  } else {
    vscode.window.showWarningMessage("No tabs to send");
  }
}
