import * as vscode from "vscode";
import { TabsProvider } from "./provider/treeDataProvider";
import { WorkState } from "./common/state";
import { Global } from "./common/global";
import { TabItem } from "./model/main/tabitem";
import { TabsState } from "./model/main/tabstate";
import { TabsGroup } from "./model/main/tabsgroup";
import { TabInputText } from "vscode";

// this method is called when your extension is activated
// your extension is activated  the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  Global.context = context;

  // for debug
  // todo: remove it
  WorkState.update("tabsState", new TabsState());

  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  let outputChannel = vscode.window.createOutputChannel("HelloWorld Debug");
  let tabsProvider = new TabsProvider(rootPath);

  vscode.window.createTreeView("tabsProvider", {
    treeDataProvider: tabsProvider,
  });

  vscode.commands.registerCommand("onetab.send.allTabs", () => {
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
        vscode.TreeItemCollapsibleState.Collapsed
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
    tabsProvider.refresh();
  });

  vscode.commands.registerCommand("onetab.send.otherTabs", () => {
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
        vscode.TreeItemCollapsibleState.Collapsed
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
    tabsProvider.refresh();
  });

  vscode.commands.registerCommand("onetab.send.thisTab", () => {
    let tab = vscode.window.tabGroups.activeTabGroup.activeTab as vscode.Tab;
    if (tab.input instanceof TabInputText) {
      const group = new TabsGroup([
        new TabItem(
          tab.label,
          tab.input.uri,
          vscode.TreeItemCollapsibleState.None
        ),
      ]);
      const state = Object.assign(
        new TabsState(),
        WorkState.get("tabsState", new TabsState())
      );
      state.addTabsGroup(group);
      WorkState.update("tabsState", state);
      vscode.window.tabGroups.close(tab);
      tabsProvider.refresh();
    }
  });

  vscode.commands.registerCommand("onetab.refreshEntry", () => {
    tabsProvider.refresh();
  });

  vscode.commands.registerCommand("onetab.test", () => {
    vscode.window.showInformationMessage("test");
  });

  vscode.commands.registerCommand(
    "onetab.restore",
    async (tabsGroup: TabsGroup) => {
      outputChannel.appendLine(tabsGroup.label);
      for (const tab of tabsGroup.tabs) {
        const fileUri = tab.fileUri;
        vscode.window.showTextDocument(fileUri, { preview: false });
      }
    }
  );

  // refresh at the beginning
  tabsProvider.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() {}
