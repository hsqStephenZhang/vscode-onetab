// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { DEFAULT_TAB_LABEL, CONTEXT_TAB } from "../constant";
import { Node } from "./node";
import { TabItemRow } from "../db/storageService";

// Tab types that can be restored
export type TabType = 'text' | 'diff' | 'notebook' | 'notebookDiff' | 'custom';

export class TabItem extends Node {
  public fileUri: vscode.Uri;
  public originalUri?: vscode.Uri;  // For diff views
  public tabType: TabType = 'text';

  constructor(uri?: vscode.Uri, id?: string, label?: string) {
    const itemId = id ?? randomUUID();
    const itemLabel = label ?? DEFAULT_TAB_LABEL;

    super(itemId, itemLabel, vscode.TreeItemCollapsibleState.None);

    this.contextValue = CONTEXT_TAB;
    this.fileUri = uri ?? vscode.Uri.parse("untitled:default");
    this.setDefaultIcon();
  }

  // --- FROM STORAGE ROW ---
  public static fromRow(row: TabItemRow): TabItem {
    const uri = vscode.Uri.parse(row.file_uri);
    const item = new TabItem(uri, row.id, row.label);
    
    // Parse optional fields
    if (row.original_uri) {
      item.originalUri = vscode.Uri.parse(row.original_uri);
    }
    if (row.tab_type) {
      item.tabType = row.tab_type as TabType;
    }
    
    return item;
  }

  public deepClone(): TabItem {
    const newTab = new TabItem(this.fileUri, undefined, this.label as string);
    newTab.tooltip = this.tooltip;
    newTab.iconPath = this.iconPath;
    newTab.originalUri = this.originalUri;
    newTab.tabType = this.tabType;
    return newTab;
  }

  public setFileUri(uri: vscode.Uri) {
    this.fileUri = uri;
  }

  public setOriginalUri(uri: vscode.Uri) {
    this.originalUri = uri;
  }

  public setTabType(type: TabType) {
    this.tabType = type;
    this.updateIcon();
  }

  private updateIcon() {
    switch (this.tabType) {
      case 'diff':
        this.iconPath = new vscode.ThemeIcon("diff");
        break;
      case 'notebook':
      case 'notebookDiff':
        this.iconPath = new vscode.ThemeIcon("notebook");
        break;
      default:
        this.setDefaultIcon();
    }
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