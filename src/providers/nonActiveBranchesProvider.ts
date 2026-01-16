import * as vscode from "vscode";
import { Node } from "../model/node";
import { TabsState } from "../model/tabstate";
import { Branch, BranchStates } from "../model/branch";
import { Global } from "../global";

// TreeDataProvider for `branches` treeview in the sidebar
export class BranchesProvider implements vscode.TreeDataProvider<Node> {
    private _onDidChangeTreeData: vscode.EventEmitter<Node | void> =
        new vscode.EventEmitter<Node | void>();
    readonly onDidChangeTreeData: vscode.Event<any | void> =
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

        context.subscriptions.push(this.branchViewer);
    }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node | undefined): vscode.ProviderResult<Node[]> {
        return new Promise(async (res, _rej) => {
            if (!element) {
                let allBranches: Branch[] = [];
                const sortedEntries = Array.from(this.branchState.branches.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]));

                for (const [branchName, branch] of sortedEntries) {
                    allBranches.push(new Branch(branchName, branch));
                }
                return res(allBranches);
            } else {
                const children = await element.getChildren();
                return res(children);
            }
        });
    }

    public getStates(): BranchStates {
        return this.branchState;
    }

    public async clearState() {
        // Delete all branches from storage
        const branchNames = Array.from(this.branchState.branches.keys());
        for (const branchName of branchNames) {
            await Global.storage.deleteBranch(branchName);
        }
        this.branchState = new BranchStates();
        this._onDidChangeTreeData.fire();
    }

    public reloadState() {
        const newState = new BranchStates();
        const branchNames = Global.storage.listBranches();

        for (const branchName of branchNames) {
            const tabsState = TabsState.loadFromStorage(branchName);
            newState.branches.set(branchName, tabsState);
        }

        this.branchState = newState;
        this._onDidChangeTreeData.fire();
    }

    public allBranches(): string[] {
        return Array.from(this.branchState.branches.keys());
    }

    public getBranchState(branchName: string): TabsState | undefined {
        return this.branchState.branches.get(branchName);
    }

    public async deleteBranch(branchName: string) {
        if (this.branchState.branches.delete(branchName)) {
            await Global.storage.deleteBranch(branchName);
            this._onDidChangeTreeData.fire();
        }
    }

    public async insertOrUpdateBranch(branchName: string, branchState: TabsState) {
        // Ensure the branch state has the correct branch name
        branchState.branchName = branchName;
        this.branchState.branches.set(branchName, branchState);
        
        // Save directly to storage
        await branchState.saveToStorage();
        this._onDidChangeTreeData.fire();
    }

    public async update() {
        // Save all branches to storage
        for (const [branchName, state] of this.branchState.branches) {
            state.branchName = branchName;
            await state.saveToStorage();
        }
        this._onDidChangeTreeData.fire();
    }

    public refresh() {
        this._onDidChangeTreeData.fire();
    }
}