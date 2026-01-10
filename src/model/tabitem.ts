// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { DEFAULT_TAB_LABEL, CONTEXT_TAB } from "../constant";
import { Node } from "./node";
import { TabItemRow } from "../db";

export class TabItem extends Node {
  public fileUri: vscode.Uri;

  constructor(uri?: vscode.Uri, id?: string, label?: string) {
    const itemId = id ?? randomUUID();
    const itemLabel = label ?? DEFAULT_TAB_LABEL;

    super(itemId, itemLabel, vscode.TreeItemCollapsibleState.None);

    this.contextValue = CONTEXT_TAB;
    this.fileUri = uri ?? vscode.Uri.parse("untitled:default");
    this.setDefaultIcon();
  }

  // --- FROM DB ROW ---
  public static fromRow(row: TabItemRow): TabItem {
    const uri = vscode.Uri.parse(row.file_uri);
    const item = new TabItem(uri, row.id, row.label);
    return item;
  }

  public deepClone(): TabItem {
    const newTab = new TabItem(this.fileUri, undefined, this.label as string);
    newTab.tooltip = this.tooltip;
    newTab.iconPath = this.iconPath;
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

  public getLabel(): string {
    return typeof this.label === 'string' ? this.label : (this.label?.label || DEFAULT_TAB_LABEL);
  }
}