// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { Node } from "./node";
import { TabItem } from "./tabitem";
import { CONTEXT_TAB_GROUP, DEFAULT_TAB_GROUP_LABEL } from "../constant";
import { Global } from '../global';

// Define the shape of the saved JSON
interface TabsGroupDTO {
  id: string;
  label: string;
  pinned: boolean;
  tags: string[];
  createTime: number;
  tabs: any[]; // These will be passed to TabItem.fromJSON
}

export class TabsGroup extends Node {
  private pinned: boolean = false;
  public tags: string[] = [];
  public createTime: number;
  public tabs: TabItem[] = [];

  constructor(id?: string, label?: string) {
    // 1. Determine ID and Label
    // If loading from file, use provided ID/Label. 
    // If creating new (via command), generate new ID and use default label logic.
    const groupId = id ?? randomUUID();

    let groupLabel = label;
    if (!groupLabel) {
      groupLabel = DEFAULT_TAB_GROUP_LABEL + Global.GroupCnt;
      // Only increment counter if we are creating a fresh group, not loading one
      if (!id) {
        Global.GroupCnt++;
      }
    }

    super(groupId, groupLabel, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = CONTEXT_TAB_GROUP;
    this.createTime = Date.now();
    this.updateTooltip();
  }

  // --- SERIALIZATION ---
  public toJSON(): TabsGroupDTO {
    return {
      id: this.id!,
      label: (typeof this.label === 'string' ? this.label : this.label?.label) || DEFAULT_TAB_GROUP_LABEL,
      pinned: this.pinned,
      tags: this.tags,
      createTime: this.createTime,
      tabs: this.tabs.map(tab => tab.toJSON())
    };
  }

  // --- DESERIALIZATION ---
  public static fromJSON(json: TabsGroupDTO): TabsGroup {
    // 1. Create instance (bypass Global.GroupCnt increment logic by passing args)
    const group = new TabsGroup(json.id, json.label);

    // 2. Restore Primitive State
    group.createTime = json.createTime;
    group.setTags(json.tags || []);
    group.setPin(json.pinned); // This restores the icon!

    // 3. Restore Children (Tabs)
    if (Array.isArray(json.tabs)) {
      group.tabs = json.tabs.map(t => {
        const tab = TabItem.fromJSON(t);
        tab.parentId = group.id; // Crucial: Re-link parent ID
        return tab;
      });
    }

    group.updateTooltip();
    return group;
  }

  public getChildren(): Node[] | Promise<Node[]> {
    return this.tabs;
  }

  // our methods

  public deepClone(): TabsGroup {
    // Clone container
    const newGroup = new TabsGroup(); // Generates new ID

    // Copy properties
    newGroup.label = this.label;
    newGroup.pinned = this.pinned;
    newGroup.setPin(this.pinned); // Restore icon
    newGroup.tags = [...this.tags];
    newGroup.createTime = this.createTime;

    // Clone tabs
    newGroup.tabs = this.tabs.map((tab) => {
      let newTab = tab.deepClone();
      newTab.parentId = newGroup.id;
      return newTab;
    });

    newGroup.updateTooltip();
    return newGroup;
  }

  public getText(): string {
    return "label: " + this.label + ", tags: " + (this.tags.length === 0 ? "empty" : this.tags.join(", "));
  }

  public isPinned(): boolean {
    return this.pinned;
  }

  public setPin(pin: boolean) {
    this.pinned = pin;
    if (pin) {
      this.iconPath = {
        dark: vscode.Uri.joinPath(Global.context.extensionUri, "media", "pin-light.svg"),
        light: vscode.Uri.joinPath(Global.context.extensionUri, "media", "pin-dark.svg"),
      };
    } else {
      this.iconPath = undefined;
    }
  }

  public getTags(): string[] {
    return this.tags;
  }

  public setTags(tags: string[]) {
    this.tags = tags;
    this.updateTooltip();
  }

  public extendTags(tags: string[]) {
    this.tags.push(...tags);
    this.updateTooltip();
  }

  public setLabel(label: string) {
    this.label = label;
    this.updateTooltip();
  }

  private updateTooltip() {
    const labelText = typeof this.label === 'string' ? this.label : (this.label?.label || '');
    this.tooltip =
      labelText +
      ", tags: " +
      (this.tags.length === 0 ? "none" : this.tags.join(", "));
  }

  public isUntitled(): boolean {
    const labelText = typeof this.label === 'string' ? this.label : (this.label?.label || '');
    return labelText.indexOf(DEFAULT_TAB_GROUP_LABEL) !== -1;
  }

  public getTabs(): TabItem[] {
    return this.tabs;
  }

  public setTabs(tabs: TabItem[]) {
    for (let tab of tabs) {
      tab.parentId = this.id;
    }
    this.tabs = tabs;
  }

  public pushTab(tab: TabItem) {
    tab.parentId = this.id;
    this.tabs.push(tab);
  }

  public extendTabs(tabs: TabItem[]) {
    for (let tab of tabs) {
      tab.parentId = this.id;
    }
    this.tabs.push(...tabs);
  }

  public removeDuplicateTabs() {
    let all_tabs = this.tabs.map((tab) => tab.fileUri.fsPath);
    let unique_tabs = new Set(all_tabs);

    // We want to keep the FIRST occurrence, so we iterate and check if it's in the set.
    // However, Sets are unordered. A better way is to track "seen".

    const seen = new Set<string>();
    const new_tabs = this.tabs.filter((tab) => {
      const path = tab.fileUri.fsPath;
      if (seen.has(path)) {
        return false;
      }
      seen.add(path);
      return true;
    });

    this.tabs = new_tabs;
  }
}