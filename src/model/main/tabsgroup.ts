// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import 'reflect-metadata';
import { Type } from "class-transformer";
import { randomUUID } from "crypto";
import { Node } from "../interface/node";
import { TabItem } from "./tabitem";
import { CONTEXT_TAB_GROUP, DEFAULT_TAB_GROUP_LABEL } from "../../constant";
import { Global } from '../../common/global';

export class TabsGroup extends Node {
  private pinned: boolean = false;
  public tags: string[] = [];
  public createTime: number;
  @Type(() => TabItem)
  public tabs: TabItem[] = [];

  constructor() {
    const id = randomUUID();
    const defaultLabel = DEFAULT_TAB_GROUP_LABEL + Global.GroupCnt;
    Global.GroupCnt++;
    super(id, defaultLabel, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = CONTEXT_TAB_GROUP;
    this.tooltip =
      this.label +
      ", tags: " +
      (this.tags.length === 0 ? "none" : this.tags.join(", "));
    this.createTime = Date.now();
  }


  public deepClone(): TabsGroup {
    let newGroup = new TabsGroup();
    newGroup.label = this.label;
    newGroup.tooltip = this.tooltip;
    newGroup.iconPath = this.iconPath;
    newGroup.pinned = this.pinned;
    newGroup.tags = this.tags.slice();
    newGroup.createTime = this.createTime;
    newGroup.tabs = this.tabs.map((tab) => {
      let newTab = tab.deepClone();
      newTab.parentId = newGroup.id;
      return newTab;
    });
    return newGroup;
  }

  public getText(): string {
    return "label: " + this.label + ", tags: " + (this.tags.length === 0 ? "empty" : this.tags.join(", "));
  }

  public getChildren(): Node[] | Promise<Node[]> {
    return this.tabs;
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
  }

  public extendTags(tags: string[]) {
    this.tags.push(...tags);
  }

  public setLabel(label: string) {
    this.label = label;
    this.tooltip = this.label + ", tags: " + (this.tags.length === 0 ? "none" : this.tags.join(", "));
  }

  public isUntitled(): boolean {
    return this.label.indexOf(DEFAULT_TAB_GROUP_LABEL) !== -1;
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
    let new_tabs = this.tabs.filter((tab) => {
      let res = unique_tabs.has(tab.fileUri.fsPath);
      unique_tabs.delete(tab.fileUri.fsPath);
      return res;
    });
    this.tabs = new_tabs;
  }
}
