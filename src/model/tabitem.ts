// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import "reflect-metadata";
import { Type } from "class-transformer";
import { randomUUID } from "crypto";
import { DEFAULT_TAB_LABEL, CONTEXT_TAB } from "../constant";
import { Node } from "./node";

export class TabItem extends Node {
  @Type(() => vscode.Uri)
  public fileUri: vscode.Uri;
  constructor(
  ) {
    const id = randomUUID();
    super(id, DEFAULT_TAB_LABEL, vscode.TreeItemCollapsibleState.None);
    this.contextValue = CONTEXT_TAB;
    // for deserialization
    this.fileUri = vscode.Uri.parse("none");
    this.iconPath = new vscode.ThemeIcon("output-view-icon");
  }

  public deepClone(): TabItem {
    let newTab = new TabItem();
    newTab.label = this.label;
    newTab.tooltip = this.tooltip;
    newTab.iconPath = this.iconPath;
    newTab.fileUri = this.fileUri;
    return newTab;
  }

  public setFileUri(uri: vscode.Uri) {
    this.fileUri = uri;
  }

  public setID(id: string) {
    this.id = id;
  }

  public setLabel(label: string) {
    this.label = label;
  }

  public setDefaultIcon() {
    this.iconPath = new vscode.ThemeIcon("output-view-icon");
  }
}
