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
  let blacklist = vscode.workspace
    .getConfiguration()
    .get("onetab.blacklist") as Array<string>;
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof vscode.TabInputText;
    })
    .filter((tab) => {
      return blacklist.every((path) => {
        return (tab.input as vscode.TabInputText).uri.path !== path;
      });
    });
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getOtherTabs(uri: vscode.Uri): vscode.Tab[] | undefined {
  let currentTab = getSelectedTab(uri);
  let blacklist = vscode.workspace
    .getConfiguration()
    .get("onetab.blacklist") as Array<string>;
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab !== currentTab && tab.input instanceof vscode.TabInputText;
    })
    .filter((tab) => {
      return blacklist.every((path) => {
        return (tab.input as vscode.TabInputText).uri.path !== path;
      });
    });
  if (tabs.length === 0) {
    return undefined;
  } else {
    return tabs;
  }
}

export function getLeftTabs(uri: vscode.Uri): vscode.Tab[] | undefined {
  let currentTab = getSelectedTab(uri);
  let blacklist = vscode.workspace
    .getConfiguration()
    .get("onetab.blacklist") as Array<string>;
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof vscode.TabInputText;
    })
    .filter((tab) => {
      return blacklist.every((path) => {
        return (tab.input as vscode.TabInputText).uri.path !== path;
      });
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

export function getRightTabs(uri: vscode.Uri): vscode.Tab[] | undefined {
  let currentTab = getSelectedTab(uri);
  let blacklist = vscode.workspace
    .getConfiguration()
    .get("onetab.blacklist") as Array<string>;
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof vscode.TabInputText;
    })
    .filter((tab) => {
      return blacklist.every((path) => {
        return (tab.input as vscode.TabInputText).uri.path !== path;
      });
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
export function getActive(): vscode.Tab {
  return vscode.window.tabGroups.activeTabGroup.activeTab as vscode.Tab;
}

export function getSelectedTab(uri: vscode.Uri): vscode.Tab | undefined {
  const allTabs = getAllTabs();
  if (allTabs) {
    const tab = allTabs.find((tab) => {
      return (
        tab.input instanceof vscode.TabInputText &&
        tab.input.uri.path === uri.path
      );
    });
    if (tab) {
      return tab;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

// safety: for every item in tabs, item.input is instance of TabInputText
export function sendTabs(tabs: vscode.Tab[], groupId?: string) {
  const tabItems = tabs.map((tab) => {
    let textFile = tab.input as vscode.TabInputText;
    return new TabItem(tab.label, textFile.uri);
  });
  let updated = false;
  let group = null;
  const state = Object.assign(
    new TabsState(),
    WorkState.get("tabsState", new TabsState())
  );

  if (groupId) {
    group = state.getGroup(groupId);
    if (group) {
      state.addTabsToGroup(groupId, tabItems);
      updated = true;
    }
  } else {
    group = new TabsGroup(tabItems);
    state.addTabsGroup(group);
    updated = true;
  }

  // check if state are updated
  if (updated) {
    WorkState.update("tabsState", state);
    vscode.window.tabGroups.close(tabs.filter((tab) => !tab.isPinned));
    Global.tabsProvider.refresh();
  }
}
