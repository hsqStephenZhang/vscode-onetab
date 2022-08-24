// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import * as vscode from "vscode";
import { TabInputText } from "vscode";
import {
  getAllTabs,
  getLeftTabs,
  getOtherTabs,
  getRightTabs,
  getSelectedTab,
  sendTabs,
} from "../utils/tab";

export async function sendAllTabs() {
  let allTabs = getAllTabs();
  if (allTabs) {
    sendTabs(allTabs);
  }
}

export async function sendOtherTabs(uri: vscode.Uri) {
  let otherTabs = getOtherTabs(uri);
  if (otherTabs) {
    sendTabs(otherTabs);
  }
}

export async function sendLeftTabs(uri: vscode.Uri) {
  let leftTabs = getLeftTabs(uri);
  if (leftTabs) {
    sendTabs(leftTabs);
  }
}

export async function sendRightTabs(uri: vscode.Uri) {
  let rightTabs = getRightTabs(uri);
  if (rightTabs) {
    sendTabs(rightTabs);
  }
}

export async function sendThisTab(uri: vscode.Uri) {
  let tab = getSelectedTab(uri);
  if (tab && tab.input instanceof TabInputText) {
    sendTabs([tab]);
  }
}
