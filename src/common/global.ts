import { TabsProvider } from "./../provider/treeDataProvider";
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";

export class Global {
  public static context: vscode.ExtensionContext;
  public static tabsProvider: TabsProvider;
  public static outputChannel: vscode.OutputChannel;
}
