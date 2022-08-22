// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import * as vscode from "vscode";
import { TabInputText } from "vscode";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { TabItem } from "../model/main/tabitem";
import { TabsGroup } from "../model/main/tabsgroup";
import { TabsState } from "../model/main/tabstate";

export async function sendAllTabs() {
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return tab.input instanceof TabInputText;
    });
  const tabItems = tabs.map((tab) => {
    // safety: already filter tabs, so tab.input are all TabInputText now
    let textFile = tab.input as TabInputText;
    return new TabItem(
      tab.label,
      textFile.uri,
    );
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

export async function sendOtherTabs() {
  let currentTab = vscode.window.tabGroups.activeTabGroup
    .activeTab as vscode.Tab;
  const tabs = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat(1)
    .filter((tab) => {
      return currentTab !== tab && tab.input instanceof TabInputText;
    });
  const tabItems = tabs.map((tab) => {
    // safety: already filter tabs, so tab.input are all TabInputText now
    let textFile = tab.input as TabInputText;
    return new TabItem(
      tab.label,
      textFile.uri,
    );
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

export async function sendThisTab() {
  let tab = vscode.window.tabGroups.activeTabGroup.activeTab as vscode.Tab;
  if (tab.input instanceof TabInputText) {
    const group = new TabsGroup([
      new TabItem(
        tab.label,
        tab.input.uri,
      ),
    ]);
    const state = Object.assign(
      new TabsState(),
      WorkState.get("tabsState", new TabsState())
    );
    state.addTabsGroup(group);
    WorkState.update("tabsState", state);
    vscode.window.tabGroups.close(tab);
    Global.tabsProvider.refresh();
  }
}
