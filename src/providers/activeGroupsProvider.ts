// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../model/node";
import { TabsGroup } from "../model/tabsgroup";
import { TabsState } from "../model/tabstate";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";
import { Global } from "../global";
import { TabItem } from "../model/tabitem";

/// TreeDataProvider for `ONETAB` treeview in the sidebar
export class TabsProvider
  implements
  vscode.TreeDataProvider<Node>, vscode.TreeDragAndDropController<Node> {
  rootPath: string | undefined;
  filterArgs: any[];
  viewer: vscode.TreeView<Node> | undefined;
  tabsState: TabsState;

  private _onDidChangeTreeData: vscode.EventEmitter<Node | void> =
    new vscode.EventEmitter<Node | void>();
  readonly onDidChangeTreeData: vscode.Event<any | void> =
    this._onDidChangeTreeData.event;

  constructor(rootPath: string | undefined, context: vscode.ExtensionContext, tabsState?: TabsState) {
    this.rootPath = rootPath;
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
      dragAndDropController: this,
      showCollapseAll: true,
      canSelectMany: true,
    });

    context.subscriptions.push(
      this.viewer
    );
  }

  // methods in `TreeDataProvider`

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  getParent(element: Node): vscode.ProviderResult<Node> {
    return element;
  }

  async getChildren(
    element?: Node
  ): Promise<Node[] | undefined | null> {
    return new Promise(async (res, rej) => {
      if (!element) {
        return res(this.tabsState.getAllTabsGroupsSorted());
      } else {
        const children = await element.getChildren();
        return res(children);
      }
    });
  }
  // methods in `TreeDragAndDropController`

  dropMimeTypes: readonly string[] = ["text/plain"];
  dragMimeTypes: readonly string[] = ["text/plain"];

  handleDrag?(source: readonly Node[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    Global.logger.info("handleDrag: " + source);
    dataTransfer.set('application/vnd.code.tree.testViewDragAndDrop', new vscode.DataTransferItem(source));
  }

  // from: item, group
  // to: item, group, undefined(the root node)
  // and we support the following operations:
  // 1. group => group: simple merge
  // 2. item => group: will add the item to the group
  // 3. group => item: will merge the group into the other group that contains the item
  // 4. item => undefined: will create a new group
  handleDrop?(dst: Node | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    const transfered = dataTransfer.get('application/vnd.code.tree.testViewDragAndDrop',);
    if (!transfered) {
      return;
    }
    const src: Node[] = transfered.value;
    if (dst && dst.id) {
      let dst_id: string | undefined;
      if (dst instanceof TabsGroup) {
        dst_id = dst.id;
      } else if (dst instanceof TabItem && dst.parentId) {
        dst_id = dst.parentId;
      }
      if (dst_id) {
        // situation 1 & 3
        const excludeSelfGroupIds = src.filter((node) => node instanceof TabsGroup).map((node) => node as TabsGroup).filter((node) => node.id !== dst_id).map((node) => node.id).filter((id) => id !== undefined);
        this.tabsState.mergeTabsGroup(dst_id, excludeSelfGroupIds)

        // situation 2
        const excludeSelfTabs = src.filter((node) => node instanceof TabItem).map((node) => node as TabItem).filter((node) => node.parentId && node.parentId !== dst_id);
        for (const tabItem of excludeSelfTabs) {
          if (tabItem.parentId) {
            this.tabsState.removeTabFromGroup(tabItem.parentId, tabItem.fileUri.fsPath);
          }
        }
        this.tabsState.addTabsToGroup(dst_id, excludeSelfTabs);

        WorkState.update(STORAGE_KEY, this.tabsState.toString());
        this.refresh();
      }
    } else if (dst === undefined) {
      // situation 4: item => undefined
      let tabItems = src.filter((node) => node instanceof TabItem).map(node => node as TabItem);
      if (tabItems.length === 0) {
        return;
      }

      // 1. unlink the tabItems with their previous parents
      for (const tabItem of tabItems) {
        if (tabItem.parentId) {
          this.tabsState.removeTabFromGroup(tabItem.parentId, tabItem.fileUri.fsPath);
        }
      }

      // 2. add the tabItems to a new group
      let group = new TabsGroup();
      let newTabItems = tabItems.map((item) => {
        item.parentId = group.id;
        return item as TabItem;
      });
      group.setTabs(newTabItems);
      this.tabsState.addTabsGroup(group);

      WorkState.update(STORAGE_KEY, this.tabsState.toString());
      this.refresh();
    }
  }

  // our methods

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

  // TODO: fixme
  public resetState(newState: TabsState) {
    for (const [k, group] of newState.groups) {
      group.setPin(group.isPinned());
      for (const tab of group.getTabs()) {
        tab.setDefaultIcon();
      }
    }
    this.tabsState = newState;
    WorkState.update(STORAGE_KEY, this.tabsState.toString());
    this.refresh();
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
}


// export function archiveCurrentBranch()