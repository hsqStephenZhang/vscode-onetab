// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { TabItem } from "../model/main/tabitem";
import { TabsGroup } from "../model/main/tabsgroup";
import { TabsState } from "../model/main/tabstate";

export function getAllTabs(): vscode.Tab[] | undefined {
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof vscode.TabInputText;
    });
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getOtherTabs(): vscode.Tab[] | undefined {
  let currentTab = getCurrentTab();
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab !== currentTab && tab.input instanceof vscode.TabInputText;
    });
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getLeftTabs(): vscode.Tab[] | undefined {
  let currentTab = getCurrentTab();
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof vscode.TabInputText;
    });
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const leftTabs = tabs.slice(0, currentIdx);
    if (leftTabs.length === 0) {
      return undefined;
    } else {
      return leftTabs;
    }
  } else {
    return undefined;
  }
}

export function getRightTabs(): vscode.Tab[] | undefined {
  let currentTab = getCurrentTab();
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof vscode.TabInputText;
    });
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const rightTabs = tabs.slice(currentIdx + 1, tabs.length);
    if (rightTabs.length === 0) {
      return undefined;
    } else {
      return rightTabs;
    }
  } else {
    return undefined;
  }
}

// safety: getCurrentTab will only be called when at least one tab is opened
export function getCurrentTab(): vscode.Tab {
  return vscode.window.tabGroups.activeTabGroup.activeTab as vscode.Tab;
}

// safety: for every item in tabs, item.input is instance of TabInputText
export function sendTabs(tabs: vscode.Tab[]) {
  const tabItems = tabs.map((tab) => {
    let textFile = tab.input as vscode.TabInputText;
    return new TabItem(tab.label, textFile.uri);
  });
  const group = new TabsGroup(tabItems);
  const state = Object.assign(
    new TabsState(),
    WorkState.get("tabsState", new TabsState())
  );
  state.addTabsGroup(group);
  WorkState.update("tabsState", state);
  vscode.window.tabGroups.close(tabs);
  Global.tabsProvider.refresh();
}
