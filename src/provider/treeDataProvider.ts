import { WorkState } from "./../common/state";
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../model/interface/node";
import { TabsState } from "../model/main/tabstate";

export class TabsProvider implements vscode.TreeDataProvider<Node> {
  rootPath: string | undefined;
  constructor(rootPath: string | undefined) {
    this.rootPath = rootPath;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> =
    new vscode.EventEmitter<Node | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<Node | undefined | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Node | undefined): Promise<Node[]> {
    return new Promise(async (res, rej) => {
      if (!element) {
        // if this is the root node (no parent), then return the list
        let tabsState: TabsState = WorkState.get("tabsState",new TabsState());
        res(tabsState.groups);
      } else {
        // else return the inner list
        const children = await element.getChildren();
        for (const child of children) {
          child.parent = element;
        }
        res(children);
      }
    });
  }
}
