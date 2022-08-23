import { OnetabPanel } from "./webview/onetab";
import * as vscode from "vscode";
import { TabsProvider } from "./provider/treeDataProvider";
import { WorkState } from "./common/state";
import { Global } from "./common/global";
import { TabsState } from "./model/main/tabstate";
import { FileWatchService } from "./service/fileWatchService";
import {
  tabsGroupPin,
  tabsGroupRemove,
  tabsGroupRename,
  tabsGroupRestore,
} from "./commands/tabsGroup";
import {
  sendAllTabs,
  sendLeftTabs,
  sendOtherTabs,
  sendRightTabs,
  sendThisTab,
} from "./commands/sendTab";
import { sendTabToNamedGroup } from "./commands/advancedSend";
import { tabRemove, tabRestore } from "./commands/tab";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
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

  let outputChannel = vscode.window.createOutputChannel("Onetab");
  let tabsProvider = new TabsProvider(rootPath);
  Global.outputChannel = outputChannel;
  Global.tabsProvider = tabsProvider;

  vscode.window.createTreeView("onetabs", {
    treeDataProvider: tabsProvider,
  });

  // send tab related commands
  vscode.commands.registerCommand("onetab.send.allTabs", sendAllTabs);
  vscode.commands.registerCommand("onetab.send.otherTabs", sendOtherTabs);
  vscode.commands.registerCommand("onetab.send.leftTabs", sendLeftTabs);
  vscode.commands.registerCommand("onetab.send.rightTabs", sendRightTabs);
  vscode.commands.registerCommand("onetab.send.thisTab", sendThisTab);

  vscode.commands.registerCommand(
    "onetab.send.advanced.sendThisTab",
    sendTabToNamedGroup
  );

  // tabs group related commands
  vscode.commands.registerCommand("onetab.tab.restore", tabRestore);
  vscode.commands.registerCommand("onetab.tab.remove", tabRemove);

  vscode.commands.registerCommand("onetab.tabsGroup.restore", tabsGroupRestore);
  vscode.commands.registerCommand("onetab.tabsGroup.rename", tabsGroupRename);
  vscode.commands.registerCommand("onetab.tabsGroup.pin", tabsGroupPin);
  vscode.commands.registerCommand("onetab.tabsGroup.remove", tabsGroupRemove);

  // watch file delete of tab groups
  let _fileWatchService = new FileWatchService();

  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer(OnetabPanel.viewType, {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: any) {
        // panel.options=
      },
    });
  }

  // refresh at the beginning
  Global.tabsProvider.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() {}
