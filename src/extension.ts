// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { TabsProvider } from "./provider/treeDataProvider";
import { WorkState } from "./common/state";
import { Global } from "./common/global";
import { TabItem } from "./model/main/tabitem";
import { TabsState } from "./model/main/tabstate";
import { TabsGroup } from "./model/main/tabsgroup";

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

  // let outputChannel = vscode.window.createOutputChannel("HelloWorld Debug");
  let tabsProvider = new TabsProvider(rootPath);

  vscode.window.createTreeView("tabsProvider", {
    treeDataProvider: tabsProvider,
  });

  vscode.commands.registerCommand("onetab.helloworld", () => {
    const tabs = vscode.window.tabGroups.all.map((group) => group.tabs).flat(1);
    const tabItems = tabs.map((tab) => {
      return new TabItem(tab.label, vscode.TreeItemCollapsibleState.Collapsed);
    });
    const group = new TabsGroup(tabItems);
    const raw: any = WorkState.get("tabsState", new TabsState());
    const state = Object.assign(new TabsState(), raw);
    state.addTabsGroup(group);
    WorkState.update("tabsState", state);
    vscode.window.tabGroups.close(tabs);
    tabsProvider.refresh();
  });

  vscode.commands.registerCommand("onetab.refreshEntry", () => {
    tabsProvider.refresh();
  });

  // refresh at the beginning
  tabsProvider.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() {}
