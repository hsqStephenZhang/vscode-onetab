// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Node } from "../model/node";
import { TabsGroup } from "../model/tabsgroup";
import { TabsState } from "../model/tabstate";
import { Global } from "../global";
import { TabItem } from "../model/tabitem";
import { randomUUID } from "crypto";

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
      this.tabsState = new TabsState(null); // null = main/active state
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

    context.subscriptions.push(this.viewer);
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  getParent(element: Node): vscode.ProviderResult<Node> {
    if (element instanceof TabItem && element.parentId) {
      return this.tabsState.getGroup(element.parentId);
    }
    return null;
  }

  async getChildren(element?: Node): Promise<Node[] | undefined | null> {
    return new Promise(async (res, _rej) => {
      if (!element) {
        return res(this.tabsState.getAllTabsGroupsSorted());
      } else {
        const children = await element.getChildren();
        return res(children);
      }
    });
  }

  dropMimeTypes: readonly string[] = ["text/plain"];
  dragMimeTypes: readonly string[] = ["text/plain"];

  handleDrag?(source: readonly Node[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    Global.logger.info("handleDrag: " + source);
    dataTransfer.set('application/vnd.code.tree.testViewDragAndDrop', new vscode.DataTransferItem(source));
  }

  handleDrop?(dst: Node | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    const transfered = dataTransfer.get('application/vnd.code.tree.testViewDragAndDrop');
    if (!transfered) return;

    const src: Node[] = transfered.value;
    if (dst && dst.id) {
      let dst_id: string | undefined;
      if (dst instanceof TabsGroup) {
        dst_id = dst.id;
      } else if (dst instanceof TabItem && dst.parentId) {
        dst_id = dst.parentId;
      }
      if (dst_id) {
        // 1. handle top level groups
        const excludeSelfGroupIds = src
          .filter((node) => node instanceof TabsGroup)
          .map((node) => node as TabsGroup)
          .filter((node) => node.id !== dst_id)
          .map((node) => node.id)
          .filter((id) => id !== undefined);
        this.tabsState.mergeTabsGroup(dst_id, excludeSelfGroupIds as string[]);

        // 2. handle individual tabs
        const excludeSelfTabs = src
          .filter((node) => node instanceof TabItem)
          .map((node) => node as TabItem)
          .filter((node) => node.parentId && node.parentId !== dst_id);

        for (const tabItem of excludeSelfTabs) {
          // only remove from src group if not pinned
          if (tabItem.parentId && !Global.tabsProvider.tabsState.getGroup(tabItem.parentId)?.isPinned()) {
            this.tabsState.removeTabFromGroup(tabItem.parentId, tabItem.fileUri.fsPath);
          }
        }

        let tabsToAdd = excludeSelfTabs.map((orig) => {
          let item = orig.deepClone();
          item.id = randomUUID();
          item.parentId = dst_id;
          return item as TabItem;
        });

        this.tabsState.addTabsToGroup(dst_id, tabsToAdd);

        // Complex merge operation - do a one-time full save
        this.tabsState.saveToStorage().then(() => {
          this.refresh();
        });
      }
    } else if (dst === undefined) {
      let tabItems = src.filter((node) => node instanceof TabItem).map(node => node as TabItem);
      if (tabItems.length === 0) return;

      for (const tabItem of tabItems) {
        if (tabItem.parentId && !Global.tabsProvider.tabsState.getGroup(tabItem.parentId)?.isPinned()) {
          this.tabsState.removeTabFromGroup(tabItem.parentId, tabItem.fileUri.fsPath);
        }
      }

      let group = new TabsGroup();
      let newTabItems = tabItems.map((orig) => {
        let item = orig.deepClone();
        item.id = randomUUID();
        item.parentId = group.id;
        return item as TabItem;
      });
      group.setTabs(newTabItems);
      this.tabsState.addTabsGroup(group);

      // New group - persist with fine-grained operation
      this.tabsState.addTabsGroupToStorage(group).then(() => {
        this.refresh();
      });
    }
  }

  public getState(): TabsState {
    return this.tabsState;
  }

  public clearState() {
    this.tabsState = new TabsState(null);
    // Full clear - use saveToStorage which clears all data for this branch
    this.tabsState.saveToStorage().then(() => {
      this.refresh();
    });
  }

  public reloadState(refresh: boolean = true) {
    this.tabsState = TabsState.loadFromStorage(null);
    if (refresh) {
      this.refresh();
    }
  }

  public resetState(newState: TabsState) {
    for (const [_k, group] of newState.groups) {
      group.setPin(group.isPinned());
      for (const tab of group.getTabs()) {
        tab.setDefaultIcon();
      }
    }
    this.tabsState = newState;
    this.tabsState.branchName = null; // Ensure it's the main state
    // Full state replacement - use saveToStorage
    this.tabsState.saveToStorage().then(() => {
      this.refresh();
    });
  }

  public updateState(updater: (state: TabsState) => void) {
    updater(this.tabsState);
    // No saveToStorage() here - fine-grained methods handle their own persistence
    // Just refresh the UI
    this.refresh();
  }

  public getTreeView(): vscode.TreeView<Node> | undefined {
    return this.viewer;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    // Also refresh tags view
    Global.tagsProvider?.refresh();
  }
}