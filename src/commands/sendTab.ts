// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import * as vscode from "vscode";
import { TabInputText } from "vscode";
import {
  getAllTabs,
  getCurrentTab,
  getLeftTabs,
  getRightTabs,
  sendTabs,
} from "../utils/tab";

export async function sendAllTabs() {
  let allTabs = getAllTabs();
  if (allTabs) {
    sendTabs(allTabs);
  }
}

export async function sendOtherTabs() {
  let otherTabs = getLeftTabs();
  if (otherTabs) {
    sendTabs(otherTabs);
  }
}

export async function sendLeftTabs() {
  let leftTabs = getLeftTabs();
  if (leftTabs) {
    sendTabs(leftTabs);
  }
}

export async function sendRightTabs() {
  let rightTabs = getRightTabs();
  if (rightTabs) {
    sendTabs(rightTabs);
  }
}

export async function sendThisTab() {
  let tab = getCurrentTab();
  if (tab.input instanceof TabInputText) {
    sendTabs([tab]);
  }
}
