// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { randomUUID } from "crypto";
import * as vscode from "vscode";
import { Node } from "../interface/node";
import { TabItem } from "./tabitem";

export const DEFAULT_LABEL = "untitled tabs group";

export class TabsGroup extends Node {
  public iconPath: vscode.ThemeIcon | undefined = undefined;
  public pinned: boolean = false;
  public tags: string[] = [];
  public tabs: TabItem[] = [];
  public id;

  constructor(tabs: TabItem[]) {
    super(DEFAULT_LABEL, vscode.TreeItemCollapsibleState.Collapsed);
    this.tabs = tabs;
    this.contextValue = "tabsGroup";
    this.id = randomUUID();
  }

  public getChildren(): Node[] | Promise<Node[]> {
    return this.tabs;
  }

  public setPin(pin: boolean) {
    this.pinned = pin;
    if (pin) {
      this.iconPath = new vscode.ThemeIcon("extensions-star-full");
    } else {
      this.iconPath = undefined;
    }
  }

  public isUntitled(): boolean {
    return this.label === DEFAULT_LABEL;
  }
}
