import { LogLevel, OutputChannelLogger } from "./logging/index";
import * as vscode from "vscode";
import "reflect-metadata";
import { TabsProvider } from "./providers/activeGroupsProvider";
import { Global } from "./global";
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
  sendToBlackList,
} from "./commands/advanced";
import { tabRemove, tabRestore } from "./commands/tab";
import { DEFAULT_BRANCH_NAME } from "./constant";
import { exportJsonData } from "./exporter";
import { searchGroup } from "./commands/search";
import { GitExtension } from "./typings/git";
import { FeedbackProvider, } from "./providers/feedbackProvider";
import { GitFileWatcher, reinitGitBranchGroups } from "./git-utils";
import { clearState, debugState } from "./commands/debug";
import { archive, cloneBranch, pickAndClone } from "./commands/branches";
import { BranchesProvider } from "./providers/nonActiveBranchesProvider";
import { ReportIssueLink, SupportLink } from "./model/feedback";
import { autoGroup } from "./autogroup";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  Global.context = context;
  let level = LogLevel.INFO;
  if (context.extensionMode == vscode.ExtensionMode.Development) {
    console.log("debug mode is on");
    level = LogLevel.DEBUG;
  }

  let outputChannel = vscode.window.createOutputChannel("Onetab");
  Global.outputChannel = outputChannel;
  Global.logger = new OutputChannelLogger(level, outputChannel);

  const rootPath =
    vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  Global.branchName = DEFAULT_BRANCH_NAME;

  // register providers: tabsProvider, branchesProvider, feedbackProvider(need not to save the state, since it's a read-only view)

  Global.tabsProvider = new TabsProvider(rootPath, context);
  Global.branchesProvider = new BranchesProvider(context);
  const feedbackItems = [
    new ReportIssueLink("https://github.com/hsqStephenZhang/vscode-onetab/issues/new"),
    new SupportLink("https://ko-fi.com/babystepping")
  ]
  new FeedbackProvider(context, "oneTabFeedback", feedbackItems);

  // initialization of `Global` is done here

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

  vscode.commands.registerCommand("onetab.debug.GetState", debugState);
  vscode.commands.registerCommand("onetab.debug.clearState", clearState);

  vscode.commands.registerCommand("onetab.search", searchGroup);
  // tabs group related commands
  vscode.commands.registerCommand("onetab.tab.restore", tabRestore);
  vscode.commands.registerCommand("onetab.tab.remove", tabRemove);

  vscode.commands.registerCommand("onetab.tabsGroup.restore", tabsGroupRestore);
  vscode.commands.registerCommand("onetab.tabsGroup.rename", tabsGroupRename);
  vscode.commands.registerCommand("onetab.tabsGroup.pin", tabsGroupPin);
  vscode.commands.registerCommand("onetab.tabsGroup.remove", tabsGroupRemove);
  vscode.commands.registerCommand("onetab.tabsGroup.tag", tabsGroupTags);
  vscode.commands.registerCommand("onetab.export", exportJsonData);

  // archive: the active state, store it into the non-active branches
  // migrate: clone  a non-active branch state to the current active state
  vscode.commands.registerCommand("onetab.branches.archive", archive);
  vscode.commands.registerCommand("onetab.branches.pickandrestore", pickAndClone);
  vscode.commands.registerCommand("onetab.branches.restorebranch", cloneBranch);
  
  vscode.commands.registerCommand("onetab.autogroup", autoGroup);

  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
  const git = gitExtension?.getAPI(1);
  let repoOnDidChangeDisposable: vscode.Disposable | void;

  if (git?.state === 'initialized') {
    repoOnDidChangeDisposable = reinitGitBranchGroups(git);
  }

  git?.onDidChangeState(e => {
    if (e === 'initialized') {
      repoOnDidChangeDisposable = reinitGitBranchGroups(git);
    } else {
      if (repoOnDidChangeDisposable) {
        repoOnDidChangeDisposable.dispose();
      }
    }
  });

  // watch delete of files in order to update the state automatically
  let _fileWatchService = new GitFileWatcher();

  // refresh at the beginning
  Global.tabsProvider.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() { }
