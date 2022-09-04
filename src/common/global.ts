import { TabsProvider } from "./../provider/treeDataProvider";
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { TabsState } from "../model/main/tabstate";
import { WorkState } from "./state";
import { STORAGE_KEY } from "../constant";

export class Global {
  public static context: vscode.ExtensionContext;
  public static tabsProvider: TabsProvider;
  public static outputChannel: vscode.OutputChannel;

  public static debugState(){
    const state = Object.assign(
      new TabsState(),
      WorkState.get(STORAGE_KEY, new TabsState())
    );
    // Global.outputChannel.appendLine("global state:"+JSON.stringify(Global.context.globalState.get(STORAGE_KEY)));
    Global.outputChannel.appendLine("workspace state:"+JSON.stringify(state.groups));
  }
}
