import { Memento } from "vscode";
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";

export abstract class Node extends vscode.TreeItem {
  public parent?: Node;

  public getChildren(): Node[] | Promise<Node[]> {
    return [];
  }

  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.id = label;
  }

  public getId(): string {
    return this.label;
  }
}
