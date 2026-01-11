import * as vscode from 'vscode';
import { Global } from '../global';

interface TagItem extends vscode.TreeItem {
  tag: string;
  groupCount: number;
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
      .map(([tag, count]) => {
        const item: TagItem = {
          label: `#${tag}`,
          description: `${count} group${count > 1 ? 's' : ''}`,
          tag,
          groupCount: count,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          iconPath: new vscode.ThemeIcon('tag'),
          command: {
            command: 'onetab.filterByTagDirect',
            title: 'Filter by this tag',
            arguments: [tag],
          },
        } as TagItem;
        return item;
      });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}