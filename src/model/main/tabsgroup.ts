// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import 'reflect-metadata';
import { Type } from "class-transformer";
import { randomUUID } from "crypto";
import * as vscode from "vscode";
import { Node } from "../interface/node";
import { TabItem } from "./tabitem";
import { CONTEXT_TAB_GROUP, DEFAULT_TAB_GROUP_LABEL } from "../../constant";

export class TabsGroup extends Node {
  private pinned: boolean = false;
  public tags: string[] = [];

  @Type(() => TabItem)
  public tabs: TabItem[] = [];
  public id;
  public createTime: number;

  constructor() {
    super(DEFAULT_TAB_GROUP_LABEL, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = CONTEXT_TAB_GROUP;
    this.id = randomUUID();
    this.tooltip =
      this.label +
      ", tags: " +
      (this.tags.length === 0 ? "none" : this.tags.join(", "));
    this.createTime = Date.now();
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
      this.iconPath = new vscode.ThemeIcon("extensions-star-full");
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
  }

  public isUntitled(): boolean {
    return this.label === DEFAULT_TAB_GROUP_LABEL;
  }

  public getTabs(): TabItem[] {
    return this.tabs;
  }

  public setTabs(tabs: TabItem[]) {
    this.tabs = tabs;
  }

  public pushTab(tab: TabItem) {
    this.tabs.push(tab);
  }

  public extendTabs(tabs: TabItem[]) {
    this.tabs.push(...tabs);
  }

  public getId(): string {
    return this.id;
  }
}
