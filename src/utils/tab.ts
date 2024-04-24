// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import { TabItem } from "../model/tabitem";
import { TabsGroup } from "../model/tabsgroup";
import { listAllKeys } from "./debug";

export function getAllTabsWithBlackList(): vscode.Tab[] | undefined {
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

export function getAllTabsWithoutBlackList(): vscode.Tab[] | undefined {
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

export function getOtherTabsWithBlacklist(uri: vscode.Uri): vscode.Tab[] | undefined {
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
    });
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const leftTabs = tabs.slice(0, currentIdx).filter((tab) => {
      return blacklist.every((path) => {
        return (tab.input as vscode.TabInputText).uri.path !== path;
      });
    });
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
    });
  const currentIdx = tabs.findIndex((tab) => tab === currentTab);
  if (currentIdx !== -1) {
    const rightTabs = tabs.slice(currentIdx + 1, tabs.length).filter((tab) => {
      return blacklist.every((path) => {
        return (tab.input as vscode.TabInputText).uri.path !== path;
      });
    });
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
  const allTabs = getAllTabsWithoutBlackList();
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
export async function sendTabs(tabs: vscode.Tab[], groupId?: string) {
  const tabItems = tabs.map((tab) => {
    let textFile = tab.input as vscode.TabInputText;
    let item = new TabItem();
    item.setLabel(tab.label);
    item.setFileUri(textFile.uri);
    item.setDefaultIcon();
    item.parentId = groupId;
    return item;
  });
  let updated = false;
  let group = null;

  if (groupId) {
    Global.tabsProvider.updateState((state) => {
      group = state.getGroup(groupId);
      if (group) {
        state.addTabsToGroup(groupId, tabItems);
        updated = true;
      }
    })
  } else {
    Global.tabsProvider.updateState((state) => {
      group = new TabsGroup();
      group.setTabs(tabItems);
      state.addTabsGroup(group);
      updated = true;
    })
  }

  // check if state are updated
  if (updated) {
    listAllKeys();
    vscode.window.tabGroups.close(tabs.filter((tab) => !tab.isPinned));
  }
}
