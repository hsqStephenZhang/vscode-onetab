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

  // Support both internal tree drag/drop and external tab drops from editor
  dropMimeTypes: readonly string[] = [
    "text/plain",
    "application/vnd.code.tree.testViewDragAndDrop",
    "text/uri-list" // VSCode tabs use this MIME type
  ];
  dragMimeTypes: readonly string[] = ["text/plain"];

  handleDrag?(source: readonly Node[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    Global.logger.info("handleDrag: " + source);
    dataTransfer.set('application/vnd.code.tree.testViewDragAndDrop', new vscode.DataTransferItem(source));
  }

  async handleDrop?(dst: Node | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    // First check if this is an internal tree drag/drop
    const transfered = dataTransfer.get('application/vnd.code.tree.testViewDragAndDrop');
    
    // If internal drag/drop
    if (transfered) {
      const src: Node[] = transfered.value;
      this._handleInternalDrop(dst, src);
      return;
    }

    // Check if this is a tab dropped from the editor
    const uriListData = dataTransfer.get('text/uri-list');
    if (uriListData) {
      await this._handleEditorTabDrop(dst, uriListData);
      return;
    }
  }

  private _handleInternalDrop(dst: Node | undefined, src: Node[]): void {
    if (dst && dst.id) {
      let dstId: string | undefined;
      if (dst instanceof TabsGroup) {
        dstId = dst.id;
      } else if (dst instanceof TabItem && dst.parentId) {
        dstId = dst.parentId;
      }
      if (dstId) {
        // Check if this is a reordering operation within the same group
        if (dst instanceof TabItem && src.length === 1 && src[0] instanceof TabItem) {
          const sourceTab = src[0] as TabItem;
          const targetTab = dst as TabItem;
          
          // If both tabs are in the same group, reorder instead of moving
          if (sourceTab.parentId === targetTab.parentId && sourceTab.parentId) {
            this.tabsState.reorderTabInGroup(sourceTab.parentId, sourceTab, targetTab);
            this.refresh();
            return;
          }
        }

        // 1. handle top level groups
        const excludeSelfGroupIds = src
          .filter((node) => node instanceof TabsGroup)
          .map((node) => node as TabsGroup)
          .filter((node) => node.id !== dstId)
          .map((node) => node.id)
          .filter((id) => id !== undefined);
        this.tabsState.mergeTabsGroup(dstId, excludeSelfGroupIds as string[]);

        // 2. handle individual tabs
        const excludeSelfTabs = src
          .filter((node) => node instanceof TabItem)
          .map((node) => node as TabItem)
          .filter((node) => node.parentId && node.parentId !== dstId);

        for (const tabItem of excludeSelfTabs) {
          // only remove from src group if not pinned
          if (tabItem.parentId && !Global.tabsProvider.tabsState.getGroup(tabItem.parentId)?.isPinned()) {
            this.tabsState.removeTabFromGroup(tabItem.parentId, tabItem.fileUri.fsPath);
          }
        }

        let tabsToAdd = excludeSelfTabs.map((orig) => {
          let item = orig.deepClone();
          item.id = randomUUID();
          item.parentId = dstId;
          return item as TabItem;
        });

        this.tabsState.addTabsToGroup(dstId, tabsToAdd);

        // Complex merge operation - do a one-time full save
        this.tabsState.saveToStorage().then(() => {
          this.refresh();
        });
      }
    } else if (dst === undefined) {
      let tabItems = src.filter((node) => node instanceof TabItem).map(node => node as TabItem);
      if (tabItems.length === 0) {
        return;
      }

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

  private async _handleEditorTabDrop(dst: Node | undefined, uriListData: vscode.DataTransferItem): Promise<void> {
    const uriListText = await uriListData.asString();
    if (!uriListText) {
      return;
    }

    // Parse the URI list (can be multiple URIs separated by newlines)
    const uriStrings = uriListText.split('\n').filter(s => s.trim());
    if (uriStrings.length === 0) {
      return;
    }

    // Find the actual VSCode tabs that match these URIs
    const allOpenTabs = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => {
        const tabUri = this._getTabUri(tab);
        return tabUri && uriStrings.some(uriStr => {
          try {
            const droppedUri = vscode.Uri.parse(uriStr.trim());
            return tabUri.toString() === droppedUri.toString();
          } catch {
            return false;
          }
        });
      });

    if (allOpenTabs.length === 0) {
      vscode.window.showWarningMessage('No matching tabs found to add to group');
      return;
    }

    // Import the sendTabs utility
    const { sendTabs } = await import('../utils/tab');

    // Determine the target group ID
    let targetGroupId: string | undefined;
    if (dst instanceof TabsGroup) {
      targetGroupId = dst.id;
    } else if (dst instanceof TabItem && dst.parentId) {
      targetGroupId = dst.parentId;
    }

    // Send tabs to the group (or create a new group if no target)
    await sendTabs(allOpenTabs, targetGroupId);
  }

  private _getTabUri(tab: vscode.Tab): vscode.Uri | undefined {
    const input = tab.input;
    if (input instanceof vscode.TabInputText) {
      return input.uri;
    }
    if (input instanceof vscode.TabInputTextDiff) {
      return input.modified;
    }
    if (input instanceof vscode.TabInputCustom) {
      return input.uri;
    }
    if (input instanceof vscode.TabInputNotebook) {
      return input.uri;
    }
    if (input instanceof vscode.TabInputNotebookDiff) {
      return input.modified;
    }
    return undefined;
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
    // Use microtask queue to ensure persistence completes first
    setTimeout(() => {
      this.refresh();
    }, 0);
  }

  public getTreeView(): vscode.TreeView<Node> | undefined {
    return this.viewer;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    Global.tagsProvider?.refresh();
  }
}