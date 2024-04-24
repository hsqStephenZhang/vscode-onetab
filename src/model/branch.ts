import * as vscode from "vscode";
import { plainToClass, Transform } from "class-transformer";
import { TabsState } from "./tabstate";
import { Node } from "./node";
import { randomUUID } from "crypto";
import { CONTEXT_BRANCH } from "../constant";

export class BranchStates {
    @Transform(value => {
        let map = new Map<string, TabsState>();
        for (let entry of Object.entries(value.value)) { map.set(entry[0], plainToClass(TabsState, entry[1])); }
        return map;
    }, { toClassOnly: true })
    public branches: Map<string, TabsState>;

    constructor() {
        this.branches = new Map();
    }
}

export class Branch extends Node {
    tabsState: TabsState;

    constructor(branchName: string, TabsState: TabsState) {
        const id = randomUUID();
        super(id, branchName, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = CONTEXT_BRANCH;
        this.tabsState = TabsState;
    }

    public getChildren(): Node[] | Promise<Node[]> {
        let sortedTabsGroups = this.tabsState.getAllTabsGroupsSorted();
        return sortedTabsGroups;
    }
}