// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";

export class FileWatchService {
  private watcher: vscode.FileSystemWatcher;

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      "**/*",
      false,
      false,
      false
    );
    this.watcher.onDidCreate((uri) => {
      Global.logger.debug(uri.fsPath);
    });
    this.watcher.onDidDelete((uri) => {
      Global.logger.debug(uri.fsPath);
      Global.tabsProvider.updateState((state) => {
        state.removeTabFromAllGroups(uri.fsPath);
      })
    });
  }
}
