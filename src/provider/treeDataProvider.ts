// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../model/interface/node";
import { TabsGroup } from "./../model/main/tabsgroup";
import { TabsState } from "../model/main/tabstate";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";

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
  vscode.TreeDataProvider<Node> {
  rootPath: string | undefined;
  filters: TabsGroupFilter[];
  filterArgs: any[];
  viewer: vscode.TreeView<Node> | undefined;
  tabsState: TabsState;

  private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> =
    new vscode.EventEmitter<Node | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<any | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(rootPath: string | undefined, context: vscode.ExtensionContext, tabsState?: TabsState) {
    this.rootPath = rootPath;
    this.filters = [];
    this.filterArgs = [];
    if (!tabsState) {
      // don't refresh
      this.tabsState = new TabsState();
      this.reloadState(false);
    } else {
      this.tabsState = tabsState;
    }
    this.viewer = vscode.window.createTreeView("main", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
    });

    context.subscriptions.push(
      this.viewer
    );
  }

  public getState(): TabsState {
    return this.tabsState;
  }

  public clearState() {
    this.tabsState = new TabsState();
    WorkState.update(STORAGE_KEY, this.tabsState.toString());
    this.refresh();
  }

  public reloadState(refresh: boolean = true) {
    const defaultState = new TabsState();
    const s = WorkState.get(STORAGE_KEY, defaultState.toString());
    const newState = TabsState.fromString(s);
    this.tabsState = newState;
    if (refresh) {
      this.refresh();
    }
  }

  public updateState(updater: (state: TabsState) => void) {
    updater(this.tabsState);
    WorkState.update(STORAGE_KEY, this.tabsState.toString());
    this.refresh();
  }

  public getTreeView(): vscode.TreeView<Node> | undefined {
    return this.viewer;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  getParent(element: Node): vscode.ProviderResult<Node> {
    return element;
  }

  async getChildren(
    element?: Node | undefined
  ): Promise<Node[] | undefined | null> {
    return new Promise(async (res, rej) => {
      if (!element) {
        // if this is the root node (no parent), then return the list
        let sortedTabsGroups = this.tabsState.getAllTabsGroupsSorted();
        return res(
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
        return res(children);
      }
    });
  }
}
