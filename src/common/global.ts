// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { TabsState } from './../model/main/tabstate';
import * as vscode from "vscode";
import { GlobalState } from "./state";
import { TabsProvider } from "./../provider/treeDataProvider";

export class Global {
  public static context: vscode.ExtensionContext;
  public static tabsProvider: TabsProvider;
  public static tabsState: TabsState;
  public static outputChannel: vscode.OutputChannel;

  public static debugState() {
    const keys = GlobalState.keys();
    Global.outputChannel.appendLine(`${keys}`);
    for (const key of keys) {
      const obj = GlobalState.get(key, undefined);
      Global.outputChannel.appendLine(`${key} : ${JSON.stringify(obj)}`);
    }
  }

  public static clearState() {
    const keys = GlobalState.keys();
    for (const key of keys) {
      GlobalState.update(key, undefined);
    }
  }

  public static init() {

  }
}
