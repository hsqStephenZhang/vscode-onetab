// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { Node } from "./node";
import { TabItem } from "./tabitem";
import { CONTEXT_TAB_GROUP, DEFAULT_TAB_GROUP_LABEL } from "../constant";
import { Global } from "../global";
import { TabsGroupRow } from "../db/storageService";

export class TabsGroup extends Node {
  private pinned: boolean = false;
  public tags: string[] = [];
  public createTime: number;
  public tabs: TabItem[] = [];

  constructor(id?: string, label?: string) {
    const groupId = id ?? randomUUID();

    let groupLabel = label;
    if (!groupLabel) {
      groupLabel = DEFAULT_TAB_GROUP_LABEL + Global.getAndIncGroupCnt();
    }

    super(groupId, groupLabel, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = CONTEXT_TAB_GROUP;
    this.createTime = Date.now();
    this.updateTooltip();
  }

  // --- FROM STORAGE ROW ---
  public static fromRow(row: TabsGroupRow): TabsGroup {
    const group = new TabsGroup(row.id, row.label);
    group.createTime = row.create_time;

    // Parse tags from JSON string
    try {
      group.tags = JSON.parse(row.tags) || [];
    } catch {
      group.tags = row.tags ? row.tags.split(",").filter((t) => t) : [];
    }

    group.setPin(row.pinned === 1);
    group.updateTooltip();
    group.updateDescription();
    return group;
  }

  public getChildren(): Node[] | Promise<Node[]> {
    return this.tabs;
  }

  public deepClone(preserveId: boolean = false): TabsGroup {
    const labelOf = (label: string | vscode.TreeItemLabel): string => {
      return typeof label === "string" ? label : label?.label || "";
    };

    const newGroup = preserveId
      ? new TabsGroup(this.id, labelOf(this.label))
      : new TabsGroup();
    if (!preserveId) {
      newGroup.label = this.label;
    }
    newGroup.pinned = this.pinned;
    newGroup.setPin(this.pinned);
    newGroup.tags = [...this.tags];
    newGroup.createTime = this.createTime;
    newGroup.tabs = this.tabs.map((tab) => {
      let newTab = tab.deepClone();
      newTab.parentId = newGroup.id;
      return newTab;
    });
    newGroup.updateTooltip();
    return newGroup;
  }

  public getLabel(): string {
    return typeof this.label === "string"
      ? this.label
      : this.label?.label || DEFAULT_TAB_GROUP_LABEL;
  }

  public getText(): string {
    return (
      "label: " +
      this.label +
      ", tags: " +
      (this.tags.length === 0 ? "empty" : this.tags.join(", "))
    );
  }

  public isPinned(): boolean {
    return this.pinned;
  }

  public setPin(pin: boolean) {
    this.pinned = pin;
    if (pin) {
      this.iconPath = {
        dark: vscode.Uri.joinPath(
          Global.context.extensionUri,
          "asset",
          "pin-light.svg",
        ),
        light: vscode.Uri.joinPath(
          Global.context.extensionUri,
          "asset",
          "pin-dark.svg",
        ),
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
    this.updateDescription();
  }

  public extendTags(tags: string[]) {
    this.tags.push(...tags);
    this.updateTooltip();
    this.updateDescription();
  }

  private updateDescription() {
    if (this.tags.length > 0) {
      this.description = this.tags.map((t) => `#${t}`).join(" ");
    } else {
      this.description = undefined;
    }
  }

  public setLabel(label: string) {
    this.label = label;
    this.updateTooltip();
  }

  private updateTooltip() {
    const labelText =
      typeof this.label === "string" ? this.label : this.label?.label || "";
    this.tooltip =
      labelText +
      ", tags: " +
      (this.tags.length === 0 ? "none" : this.tags.join(", "));
  }

  public isUntitled(): boolean {
    const labelText =
      typeof this.label === "string" ? this.label : this.label?.label || "";
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
