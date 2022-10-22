// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";
import { currentState, getStateFromStorage } from "../utils/state";

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
      Global.outputChannel.appendLine(uri.fsPath);
    });
    this.watcher.onDidDelete((uri) => {
      Global.outputChannel.appendLine(uri.fsPath);
      const state = currentState();
      state.removeTabFromAllGroups(uri.fsPath);
      WorkState.update(STORAGE_KEY, state.toString());
      Global.tabsProvider.refresh();
    });
  }
}
