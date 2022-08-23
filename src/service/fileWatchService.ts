// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { TabsState } from "../model/main/tabstate";
import { Global } from "../common/global";
import { WorkState } from "../common/state";

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
        WorkState.get("tabsState", new TabsState())
      );
      state.removeTabFromAllGroups(uri.fsPath);
      WorkState.update("tabsState", state);
      Global.tabsProvider.refresh();
    });
  }
}
