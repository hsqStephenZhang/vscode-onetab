import { LogLevel, OutputChannelLogger } from "./logging/index";
import * as vscode from "vscode";
import "reflect-metadata";
import { OnetabPanel } from "./view/onetabPanel";
import { BranchesProvider, TabsProvider } from "./provider/treeDataProvider";
import { WorkState } from "./common/state";
import { Global } from "./common/global";
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
import { DEFAULT_BRANCH_NAME, STORAGE_KEY } from "./constant";
import { deleteAllKeys, listAllKeys } from "./utils/debug";
import { exportJsonData } from "./exporter";
import { showFilterQuickPick } from "./commands/search";
import { API, GitExtension } from "./typeings/git";
import { FeedbackProvider, ReportIssueLink, SupportLink } from "./provider/feedbackProvider";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  Global.context = context;

  let outputChannel = vscode.window.createOutputChannel("Onetab");
  Global.outputChannel = outputChannel;
  Global.logger = new OutputChannelLogger(LogLevel.INFO, outputChannel);

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
    new SupportLink("https://github.com/hsqStephenZhang/vscode-onetab")
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

  vscode.commands.registerCommand("onetab.debug.GetState", listAllKeys);
  vscode.commands.registerCommand("onetab.debug.clearState", () => {
    deleteAllKeys();
    Global.tabsProvider.clearState();
    Global.branchesProvider.clearState();
  });

  vscode.commands.registerCommand("onetab.list", async () => {
    await showFilterQuickPick();
  })

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
  vscode.commands.registerCommand("onetab.export", exportJsonData);

  // archive the active branch state, store it into the non-active branches
  vscode.commands.registerCommand("onetab.archive", () => {
    let activeState = Global.tabsProvider.getState();
    let activeBranchName = Global.branchName;
    Global.branchesProvider.insertOrUpdateBranch(activeBranchName, activeState);
    Global.tabsProvider.clearState();
  })


  // migrate a non-active branch state to the current branch state
  vscode.commands.registerCommand("onetab.migrate", () => {
    let allBranchNames = Global.branchesProvider.allBranches();
    let items: vscode.QuickPickItem[] = allBranchNames.map((branchName) => {
      return {
        label: branchName,
      };
    });
    vscode.window.showQuickPick(items).then((selection) => {
      if (selection) {
        let branchName = selection.label;
        let branchState = Global.branchesProvider.getBranchState(branchName);
        if (branchState) {
          let newBranchState = branchState.deepClone();
          Global.tabsProvider.resetState(newBranchState);
        }
      }
    })
  });

  // watch delete of files in order to update the state automatically
  let _fileWatchService = new FileWatchService();

  vscode.commands.registerCommand("onetab.advanced.view", () => {
    OnetabPanel.createOrShow(context.extensionUri);
  });

  // todo: confirm serialize logic
  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer(OnetabPanel.viewType, {
      async deserializeWebviewPanel(
        _panel: vscode.WebviewPanel,
        _state: any
      ) { },
    });
  }

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

  // refresh at the beginning
  Global.tabsProvider.refresh();
}

function reinitGitBranchGroups(git: API): vscode.Disposable | void {
  if (git.repositories.length === 0) { return; }

  const repo = git.repositories[0];
  let latestBranch = repo.state.HEAD?.name;
  Global.branchName = latestBranch || DEFAULT_BRANCH_NAME;
  // WorkState.update(STORAGE_KEY);
  Global.logger.debug(`reinitGitBranchGroups, current Branch: ${latestBranch}`);
  return repo.state.onDidChange(async () => {
    if (repo.state.HEAD?.name !== Global.branchName) {
      Global.logger.debug(`Branch changed, from: ${Global.branchName}, to: ${repo.state.HEAD?.name}`);

      // do the state switch
      let activeState = Global.tabsProvider.getState();
      let activeBranchName = Global.branchName;
      Global.branchName = repo.state.HEAD?.name || DEFAULT_BRANCH_NAME;
      Global.branchesProvider.insertOrUpdateBranch(activeBranchName, activeState);
      let newState = Global.branchesProvider.getBranchState(Global.branchName);
      if (newState) {
        Global.tabsProvider.resetState(newState);
      } else {
        Global.tabsProvider.clearState();
      }
    }
  })
}

// this method is called when your extension is deactivated
export function deactivate() { }
