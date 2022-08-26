// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { randomUUID } from "crypto";
import * as vscode from "vscode";
import { Node } from "../interface/node";

export class TabItem extends Node {
  public iconPath = new vscode.ThemeIcon("output-view-icon");
  public fileUri: vscode.Uri;
  public valid: boolean;
  constructor(
    public readonly label: string,
    public readonly uri: vscode.Uri,
    public readonly command?: vscode.Command
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.fileUri = uri;
    this.contextValue = "tab";
    this.valid = true;
    this.id = randomUUID();
  }
}
