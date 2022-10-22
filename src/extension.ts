import { OnetabPanel } from "./view/onetabPanel";
import * as vscode from "vscode";
import { TabsProvider } from "./provider/treeDataProvider";
import { GlobalState, WorkState } from "./common/state";
import { Global } from "./common/global";
import { TabsState } from "./model/main/tabstate";
import { FileWatchService } from "./service/fileWatchService";
import {
  tabsGroupPin,
  tabsGroupRemove,
  tabsGroupRename,
  tabsGroupRestore,
  tabsGroupTags,
} from "./commands/tabsGroup";
import {
  sendAllTabs,
  sendLeftTabs,
  sendOtherTabs,
  sendRightTabs,
  sendThisTab,
} from "./commands/sendTab";
import {
  advancedSendAllTabs,
  advancedSendLeftTabs,
  advancedSendOtherTabs,
  advancedSendRightTabs,
  advancedSendThisTab,
  searchTab,
  sendToBlackList,
} from "./commands/advanced";
import { tabRemove, tabRestore } from "./commands/tab";
import { STORAGE_KEY } from "./constant";
import { currentState, getStateFromStorage } from "./utils/state";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  Global.context = context;

  let outputChannel = vscode.window.createOutputChannel("Onetab");
  Global.outputChannel = outputChannel;

  // Global.clearState();
  Global.debugState();
  // for debug
  const old = getStateFromStorage();
  Global.tabsState = old;
  WorkState.update(STORAGE_KEY, old.toString());
  // if (old === undefined) {
  //   vscode.window.showInformationMessage("old state found");
  //   WorkState.update(STORAGE_KEY, old);
  // } else {
  //   vscode.window.showInformationMessage("old state not found");
  //   WorkState.update(STORAGE_KEY, old.toString());
  // }

  const rootPath =
    vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  let tabsProvider = new TabsProvider(rootPath, context);
  Global.tabsProvider = tabsProvider;

  // send tab related commands
  vscode.commands.registerCommand("onetab.send.thisTab", sendThisTab);
  vscode.commands.registerCommand("onetab.send.otherTabs", sendOtherTabs);
  vscode.commands.registerCommand("onetab.send.leftTabs", sendLeftTabs);
  vscode.commands.registerCommand("onetab.send.rightTabs", sendRightTabs);
  vscode.commands.registerCommand("onetab.send.allTabs", sendAllTabs);

  vscode.commands.registerCommand("onetab.send.blacklist", sendToBlackList);
  vscode.commands.registerCommand("onetab.edit.blacklist", () => {
    vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "onetab.blacklist"
    );
  });

  vscode.commands.registerCommand(
    "onetab.advanced.send.thisTab",
    advancedSendThisTab
  );
  vscode.commands.registerCommand(
    "onetab.advanced.send.otherTabs",
    advancedSendOtherTabs
  );
  vscode.commands.registerCommand(
    "onetab.advanced.send.leftTabs",
    advancedSendLeftTabs
  );
  vscode.commands.registerCommand(
    "onetab.advanced.send.rightTabs",
    advancedSendRightTabs
  );
  vscode.commands.registerCommand(
    "onetab.advanced.send.allTabs",
    advancedSendAllTabs
  );

  vscode.commands.registerCommand("onetab.advanced.search", () =>
    searchTab(context.extensionUri)
  );

  // tabs group related commands
  vscode.commands.registerCommand("onetab.tab.restore", tabRestore);
  vscode.commands.registerCommand("onetab.tab.remove", tabRemove);

  vscode.commands.registerCommand("onetab.tabsGroup.restore", tabsGroupRestore);
  vscode.commands.registerCommand("onetab.tabsGroup.rename", tabsGroupRename);
  vscode.commands.registerCommand("onetab.tabsGroup.pin", tabsGroupPin);
  vscode.commands.registerCommand("onetab.tabsGroup.remove", tabsGroupRemove);
  vscode.commands.registerCommand("onetab.tabsGroup.tag", tabsGroupTags);

  // watch file delete of tab groups
  let _fileWatchService = new FileWatchService();

  vscode.commands.registerCommand("onetab.advanced.view", () => {
    OnetabPanel.createOrShow(context.extensionUri);
  });

  // todo: confirm serialize logic
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
export function deactivate() { }
