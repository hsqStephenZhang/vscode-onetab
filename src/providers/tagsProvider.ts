import * as vscode from 'vscode';
import { Global } from '../global';

export class TagItem extends vscode.TreeItem {
  constructor(
    public readonly tag: string,
    public readonly groupCount: number,
  ) {
    super(`#${tag}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${groupCount} group${groupCount > 1 ? 's' : ''}`;
    this.iconPath = new vscode.ThemeIcon('tag');
    this.contextValue = 'tagItem';  // This enables context menu
    this.command = {
      command: 'onetab.filterByTagDirect',
      title: 'Filter by this tag',
      arguments: [tag],
    };
  }
}

export class TagsProvider implements vscode.TreeDataProvider<TagItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TagItem | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: TagItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<TagItem[]> {
    const state = Global.tabsProvider.getState();
    const tagCounts = new Map<string, number>();
    
    for (const [, group] of state.groups) {
      for (const tag of group.getTags()) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => new TagItem(tag, count));
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}