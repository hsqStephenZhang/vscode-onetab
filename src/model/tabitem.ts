// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { DEFAULT_TAB_LABEL, CONTEXT_TAB } from "../constant";
import { Node } from "./node";

// Data Transfer Object for saving to JSON
interface TabItemDTO {
  id: string;
  label: string;
  fileUri: string; // Serialized as string
}

export class TabItem extends Node {
  public fileUri: vscode.Uri;

  /**
   * @param uri The URI of the file. Defaults to a placeholder if not provided.
   * @param id Optional ID. If not provided, a new UUID is generated.
   * @param label Optional Label.
   */
  constructor(
    uri?: vscode.Uri,
    id?: string,
    label?: string
  ) {
    // 1. Determine ID (Restore existing or generate new)
    const itemId = id ?? randomUUID();
    const itemLabel = label ?? DEFAULT_TAB_LABEL;

    // 2. Pass to Parent (Node)
    // Assuming Node constructor signature is: constructor(id, label, state)
    super(itemId, itemLabel, vscode.TreeItemCollapsibleState.None);

    this.contextValue = CONTEXT_TAB;
    this.fileUri = uri ?? vscode.Uri.parse("untitled:default");
    this.setDefaultIcon();
  }

  // --- SERIALIZATION (Saving) ---
  public toJSON(): TabItemDTO {
    return {
      id: this.id || randomUUID(),
      label: this.getLabel(),
      fileUri: this.fileUri.toString(), // Convert URI object to string
    };
  }

  // --- DESERIALIZATION (Loading) ---
  public static fromJSON(json: TabItemDTO): TabItem {
    // 1. Revive URI
    const uri = vscode.Uri.parse(json.fileUri);

    // 2. Create instance with restored ID and Label
    const item = new TabItem(uri, json.id, json.label);

    return item;
  }

  public deepClone(): TabItem {
    // Cleaner clone using the constructor
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