// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../model/interface/node";
import { TabsState } from "../model/main/tabstate";
import { TabsGroup } from "./../model/main/tabsgroup";
import { WorkState } from "./../common/state";
import { STORAGE_KEY } from "../constant";
import { currentState, getStateFromStorage } from "../utils/state";

type TabsGroupFilter = (tabsGroup: TabsGroup, ...args: any) => boolean;

function filterByName(group: TabsGroup): boolean {
  return true;
}

function filterByPinned(group: TabsGroup): boolean {
  return group.isPinned();
}

function filterByTags(group: TabsGroup): boolean {
  return true;
}

function filterByInnerTabs(group: TabsGroup): boolean {
  return true;
}

export class TabsProvider
  implements
  vscode.TreeDataProvider<Node>
{
  rootPath: string | undefined;
  filters: TabsGroupFilter[];
  filterArgs: any[];

  private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> =
    new vscode.EventEmitter<Node | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<any | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(rootPath: string | undefined, context: vscode.ExtensionContext) {
    this.rootPath = rootPath;
    this.filters = [];
    this.filterArgs = [];

    context.subscriptions.push(
      vscode.window.createTreeView("main", {
        treeDataProvider: this,
        showCollapseAll: true,
        canSelectMany: true,
      })
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: Node | undefined
  ): Promise<Node[] | undefined | null> {
    return new Promise(async (res, rej) => {
      if (!element) {
        // if this is the root node (no parent), then return the list
        let tabsState = currentState();
        let sortedTabsGroups = tabsState.getAllTabsGroupsSorted();
        res(
          sortedTabsGroups.filter((item) => {
            return this.filters.every((f) => f(item));
          })
        );
      } else {
        // else return the inner list
        const children = await element.getChildren();
        for (const child of children) {
          child.parentId = element.id;
        }
        res(children);
      }
    });
  }
}
