// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../interface/node";

export class TabItem extends Node {
  public iconPath = new vscode.ThemeIcon("output-view-icon");
  public fileUri: vscode.Uri;
  constructor(
    public readonly label: string,
    public readonly uri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.fileUri = uri;
    this.contextValue = "tab";
  }

  public getChildren(): Node[] {
    return [];
  }
}
