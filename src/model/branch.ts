import * as vscode from "vscode";
import { TabsState } from "./tabstate";
import { Node } from "./node";
import { randomUUID } from "crypto";
import { CONTEXT_BRANCH } from "../constant";

export class BranchStates {
    public branches: Map<string, TabsState>;

    constructor() {
        this.branches = new Map();
    }
}

export class Branch extends Node {
    tabsState: TabsState;

    constructor(branchName: string, tabsState: TabsState) {
        let id = randomUUID();
        super(id, branchName, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = CONTEXT_BRANCH;
        this.tabsState = tabsState;
    }

    public getChildren(): Node[] | Promise<Node[]> {
        return this.tabsState.getAllTabsGroupsSorted();
    }
}