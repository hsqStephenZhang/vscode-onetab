import { LogLevel, OutputChannelLogger } from "./logging/index";
import * as vscode from "vscode";
import { TabsProvider } from "./providers/activeGroupsProvider";
import { Global } from "./global";
import {
  tabsGroupPin,
  tabsGroupRemove,
  tabsGroupRename,
  tabsGroupRestore,
  tabsGroupTags,
  tabsGroupCollapse,
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
import { tabRemove, tabRestore, tabRestoreKeep, tabForceRemove } from "./commands/tab";
import { DEFAULT_BRANCH_NAME } from "./constant";
import { exportJsonData, importJsonData } from "./import_export";
import { searchGroup, filterByTag, filterByTagDirect, removeTagFromAllGroups } from "./commands/search";
import { GitExtension } from "./typings/git";
import { FeedbackProvider, } from "./providers/feedbackProvider";
import { GitFileWatcher, reinitGitBranchGroups } from "./utils/git";
import { clearState, debugState } from "./commands/debug";
import { archive, cloneBranch, pickAndClone } from "./commands/branches";
import { BranchesProvider } from "./providers/nonActiveBranchesProvider";
import { ReportIssueLink, SupportLink } from "./model/feedback";
import { autoGroup, manageCustomStrategies } from "./autogroup";
import { SqlJsDatabaseService } from "./db";
import { TagsProvider } from "./providers/tagsProvider";
import { StorageService } from "./db/storageService";
import { blacklistService } from "./utils/blacklistService";
import { reorderTabsByGroupsCommand, reorderAllTabsByGroupsCommand } from "./commands/reorder";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  Global.context = context;

  let level = LogLevel.INFO;
  if (context.extensionMode == vscode.ExtensionMode.Development) {
    console.log("debug mode is on");
    level = LogLevel.DEBUG;
  }

  let outputChannel = vscode.window.createOutputChannel("Onetab");
  Global.outputChannel = outputChannel;
  Global.logger = new OutputChannelLogger(level, outputChannel);

  Global.storage = new StorageService(context.workspaceState);

  // Initialize blacklist service with caching and auto-update
  blacklistService.initialize();
  context.subscriptions.push(blacklistService);

  const rootPath =
    vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  Global.branchName = DEFAULT_BRANCH_NAME;

  // register providers: tabsProvider, branchesProvider, feedbackProvider(need not to save the state, since it's a read-only view)

  Global.tabsProvider = new TabsProvider(rootPath, context);
  Global.branchesProvider = new BranchesProvider(context);

  // Register TagsProvider
  Global.tagsProvider = new TagsProvider();
  const tagsTreeView = vscode.window.createTreeView("tags", {
    treeDataProvider: Global.tagsProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(tagsTreeView);

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
      "workbench.action.openWorkspaceSettings",
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

  // Register tag filter commands
  vscode.commands.registerCommand("onetab.filterByTag", filterByTag);
  vscode.commands.registerCommand("onetab.filterByTagDirect", filterByTagDirect);
  vscode.commands.registerCommand("onetab.tag.remove", removeTagFromAllGroups);

  // tabs group related commands
  vscode.commands.registerCommand("onetab.tab.restore", tabRestore);
  vscode.commands.registerCommand("onetab.tab.restoreKeep", tabRestoreKeep);
  vscode.commands.registerCommand("onetab.tab.remove", tabRemove);
  vscode.commands.registerCommand("onetab.tab.forceRemove", tabForceRemove);

  vscode.commands.registerCommand("onetab.tabsGroup.restore", tabsGroupRestore);
  vscode.commands.registerCommand("onetab.tabsGroup.rename", tabsGroupRename);
  vscode.commands.registerCommand("onetab.tabsGroup.pin", tabsGroupPin);
  vscode.commands.registerCommand("onetab.tabsGroup.remove", tabsGroupRemove);
  vscode.commands.registerCommand("onetab.tabsGroup.tag", tabsGroupTags);
  vscode.commands.registerCommand("onetab.tabsGroup.collapse", tabsGroupCollapse);
  vscode.commands.registerCommand("onetab.export", exportJsonData);
  vscode.commands.registerCommand("onetab.import", importJsonData);

  // archive: the active state, store it into the non-active branches
  // migrate: clone  a non-active branch state to the current active state
  vscode.commands.registerCommand("onetab.branches.archive", archive);
  vscode.commands.registerCommand("onetab.branches.pickandrestore", pickAndClone);
  vscode.commands.registerCommand("onetab.branches.restorebranch", cloneBranch);

  vscode.commands.registerCommand("onetab.autogroup", autoGroup);
  vscode.commands.registerCommand("onetab.autogroup.manageStrategies", manageCustomStrategies);

  // Reorder tabs commands
  vscode.commands.registerCommand("onetab.reorder.selectGroups", reorderTabsByGroupsCommand);

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
