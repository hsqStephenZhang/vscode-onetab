import * as vscode from "vscode";
import { Node } from "../model/node";
import { TabsState } from "../model/tabstate";
import { WorkState } from "../common/state";
import { BRANCHES_KEY } from "../constant";
import { Branch, BranchStates } from "../model/branch";
import { randomUUID } from "crypto";

// TreeDataProvider for `branches` treeview in the sidebar
export class BranchesProvider implements vscode.TreeDataProvider<Node> {
    private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> =
        new vscode.EventEmitter<Node | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined | void> =
        this._onDidChangeTreeData.event;

    branchViewer: vscode.TreeView<Node> | undefined;
    branchState: BranchStates;

    constructor(context: vscode.ExtensionContext) {
        this.branchState = new BranchStates();

        this.branchViewer = vscode.window.createTreeView("branches", {
            treeDataProvider: this,
            showCollapseAll: true,
            canSelectMany: true,
        });

        this.reloadState();

        context.subscriptions.push(
            this.branchViewer
        );
    }

    // methods in `TreeDataProvider`

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node | undefined): vscode.ProviderResult<Node[]> {
        return new Promise(async (res, _rej) => {
            if (!element) {
                // if this is the root node (no parent), then return the list
                let allBranches: Branch[] = [];
                // Sort branches? (Optional: alphabetical)
                const sortedEntries = Array.from(this.branchState.branches.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                
                for (const [branchName, branch] of sortedEntries) {
                    allBranches.push(new Branch(branchName, branch));
                }
                return res(allBranches);
            } else {
                // else return the inner list
                const children = await element.getChildren();
                return res(children);
            }
        });
    }

    // our methods

    public getStates(): BranchStates {
        return this.branchState;
    }

    public clearState() {
        this.branchState = new BranchStates();
        // Clear storage
        this.update();
    }

    reloadState() {
        // 1. Get raw string
        const s = WorkState.get(BRANCHES_KEY, "");
        
        if (!s) {
            this.branchState = new BranchStates();
            return;
        }

        try {
            // 2. Parse JSON
            const rawObj = JSON.parse(s);
            const newState = new BranchStates();

            // 3. Rehydrate (Manually map Object -> Map<string, TabsState>)
            // We assume the saved JSON structure is { branches: { "name": TabsStateDTO, ... } }
            if (rawObj && rawObj.branches) {
                for (const [name, rawTabState] of Object.entries(rawObj.branches)) {
                    // Use the static factory we created in TabsState
                    // This handles re-creating the Maps, Sets, and Icons automatically
                    const tabState = TabsState.fromJSON(rawTabState as any);
                    newState.branches.set(name, tabState);
                }
            }

            this.branchState = newState;
            this._onDidChangeTreeData.fire();

        } catch (e) {
            console.error("Failed to reload branches state", e);
            this.branchState = new BranchStates();
        }
    }

    public allBranches(): string[] {
        return Array.from(this.branchState.branches.keys());
    }

    public getBranchState(branchName: string): TabsState | undefined {
        return this.branchState.branches.get(branchName);
    }

    public deleteBranch(branchName: string) {
        if (this.branchState.branches.delete(branchName)) {
            this.update();
        }
    }

    public insertOrUpdateBranch(branchName: string, branchState: TabsState) {
        this.branchState.branches.set(branchName, branchState);
        this.update();
    }

    public update() {
        // 1. Serialize Map -> Object
        // We cannot just stringify `this.branchState` because Maps don't serialize to JSON automatically.
        const branchesObj: Record<string, any> = {};
        
        for (const [name, state] of this.branchState.branches) {
            branchesObj[name] = state.toJSON(); // Delegate to TabsState.toJSON()
        }

        const dataToSave = {
            branches: branchesObj
        };

        // 2. Save
        WorkState.update(BRANCHES_KEY, JSON.stringify(dataToSave));
        this._onDidChangeTreeData.fire();
    }

    public refresh() {
        this._onDidChangeTreeData.fire();
    }
}