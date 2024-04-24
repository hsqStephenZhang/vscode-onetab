// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";

// Node class is a abstract class that extends vscode.TreeItem
// used to represent a node our treeviews(activeGroups & nonActiveBranches)
export abstract class Node extends vscode.TreeItem {
  public parentId?: string;

  public getChildren(): Node[] | Promise<Node[]> {
    return [];
  }

  constructor(
    id: string,
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.id = id;
  }
}
