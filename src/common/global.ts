// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Logger } from "../logging";
import { TabsState } from './../model/main/tabstate';
import { BranchesProvider, TabsProvider } from "./../provider/treeDataProvider";

// global is a singleton, can be used after initialization at the beginning of the extension
export class Global {
  public static GroupCnt: number = 0;
  public static context: vscode.ExtensionContext;
  public static branchName: string;
  public static tabsProvider: TabsProvider;
  public static branchesProvider: BranchesProvider;
  public static outputChannel: vscode.OutputChannel;
  public static logger: Logger;
}
