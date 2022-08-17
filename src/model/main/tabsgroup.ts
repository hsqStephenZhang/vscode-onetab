// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../interface/node";
import { TabItem } from "./tabitem";

export class TabsGroup extends Node {
  public pinned: boolean = false;
  public title: string = "";
  public tags: string[] = [];
  public tabs: TabItem[] = [];

  constructor(tabs: TabItem[]) {
    super("untitled tabs group", vscode.TreeItemCollapsibleState.Collapsed);
    this.tabs = tabs;
    this.contextValue = "tabsGroup";
  }

  public getChildren(): Node[] | Promise<Node[]> {
    return this.tabs;
  }
}
