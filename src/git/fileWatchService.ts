// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { DEFAULT_BRANCH_NAME } from "../constant";
import { GitExtension } from "../typeings/git";
import { reinitGitBranchGroups } from ".";

const pattern = "/.git";

export class GitFileWatcher {
  private watcher: vscode.FileSystemWatcher;

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      "**/*",
      false,
      false,
      false
    );
    this.watcher.onDidCreate((uri) => {
      // the creation of .git folder
      if (uri.fsPath.endsWith(pattern)) {
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        const git = gitExtension?.getAPI(1);
        if (git) {
          Global.logger.debug("initializing git branch groups");
          reinitGitBranchGroups(git);
        } else {
          Global.logger.error("failed to get git API");
        }
      }

      Global.logger.debug(uri.fsPath);
    });
    this.watcher.onDidDelete((uri) => {

      // delete of .git folder
      if (uri.fsPath.endsWith(pattern)) {
        Global.branchName = DEFAULT_BRANCH_NAME;
        Global.logger.debug("git folder deleted");
        return;
      }


      // delete of normal files 
      let autoClean = vscode.workspace
        .getConfiguration()
        .get("onetab.autoclean") as boolean;

      Global.logger.debug(uri.fsPath);
      if (autoClean) {
        Global.tabsProvider.updateState((state) => {
          state.removeTabFromAllGroups(uri.fsPath);
        })
      }
    });
  }
}
