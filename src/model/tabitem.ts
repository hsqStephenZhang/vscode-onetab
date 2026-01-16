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
    // Use theme icon that respects the current file icon theme
    const fileName = this.fileUri.fsPath;
    this.iconPath = this.getIconForFile(fileName);
  }

  private getIconForFile(fileName: string): vscode.ThemeIcon {
    // Get file extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Map common extensions to appropriate theme icons
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'mjs':
      case 'cjs':
        return new vscode.ThemeIcon('symbol-method'); // Code file
      case 'json':
      case 'jsonc':
        return new vscode.ThemeIcon('json');
      case 'md':
      case 'markdown':
        return new vscode.ThemeIcon('markdown');
      case 'html':
      case 'htm':
        return new vscode.ThemeIcon('code');
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return new vscode.ThemeIcon('symbol-color');
      case 'py':
      case 'pyc':
      case 'pyo':
        return new vscode.ThemeIcon('symbol-method');
      case 'java':
      case 'class':
        return new vscode.ThemeIcon('symbol-class');
      case 'xml':
      case 'svg':
        return new vscode.ThemeIcon('symbol-structure');
      case 'yml':
      case 'yaml':
        return new vscode.ThemeIcon('symbol-namespace');
      case 'rs':
      case 'go':
      case 'c':
      case 'cpp':
      case 'h':
      case 'hpp':
        return new vscode.ThemeIcon('symbol-method');
      case 'sh':
      case 'bash':
      case 'zsh':
        return new vscode.ThemeIcon('terminal');
      case 'sql':
        return new vscode.ThemeIcon('database');
      case 'log':
        return new vscode.ThemeIcon('output');
      case 'txt':
        return new vscode.ThemeIcon('file-text');
      case 'pdf':
        return new vscode.ThemeIcon('file-pdf');
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
      case 'ico':
        return new vscode.ThemeIcon('file-media');
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return new vscode.ThemeIcon('file-zip');
      default:
        // Default file icon from theme
        return new vscode.ThemeIcon('file');
    }
  }

  public getLabel(): string {
    return typeof this.label === 'string' ? this.label : (this.label?.label || DEFAULT_TAB_LABEL);
  }
}