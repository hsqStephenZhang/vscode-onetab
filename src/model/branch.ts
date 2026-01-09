import * as vscode from "vscode";
import { TabsState } from "./tabstate";
import { Node } from "./node";
import { randomUUID } from "crypto";
import { CONTEXT_BRANCH } from "../constant";

// DTO for BranchStates
interface BranchStatesDTO {
    branches: { [key: string]: any };
}

export class BranchStates {
    public branches: Map<string, TabsState>;

    constructor() {
        this.branches = new Map();
    }

    // --- SERIALIZATION ---
    public toJSON(): BranchStatesDTO {
        const branchesObj: { [key: string]: any } = {};
        for (const [name, state] of this.branches) {
            branchesObj[name] = state.toJSON();
        }
        return { branches: branchesObj };
    }

    // --- DESERIALIZATION ---
    public static fromJSON(json: BranchStatesDTO): BranchStates {
        const newState = new BranchStates();
        
        if (json && json.branches) {
            for (const key of Object.keys(json.branches)) {
                const rawState = json.branches[key];
                // Delegate to TabsState.fromJSON to handle the heavy lifting
                const tabsState = TabsState.fromJSON(rawState);
                newState.branches.set(key, tabsState);
            }
        }
        
        return newState;
    }
}

export class Branch extends Node {
    tabsState: TabsState;

    constructor(id: string, branchName: string, tabsState: TabsState) {
        // 1. Call Super with Label + State (TreeItem signature)
        super(id, branchName, vscode.TreeItemCollapsibleState.Collapsed);
        
        // 2. Set ID manually
        this.id = randomUUID();
        
        this.contextValue = CONTEXT_BRANCH;
        this.tabsState = tabsState;
        
        // Optional: Add an icon for branches if desired
        // this.iconPath = new vscode.ThemeIcon("git-branch");
    }

    public getChildren(): Node[] | Promise<Node[]> {
        return this.tabsState.getAllTabsGroupsSorted();
    }
}