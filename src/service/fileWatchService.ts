// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { TabsState } from "../model/main/tabstate";
import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";

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
      const state = Object.assign(
        new TabsState(),
        WorkState.get(STORAGE_KEY, new TabsState())
      );
      state.removeTabFromAllGroups(uri.fsPath);
      WorkState.update(STORAGE_KEY, state);
      Global.tabsProvider.refresh();
    });
  }
}
