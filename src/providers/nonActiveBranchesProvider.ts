import * as vscode from "vscode";
import { Node } from "../model/node";
import { TabsState } from "../model/tabstate";
import { WorkState } from "../common/state";
import { BRANCHES_KEY } from "../constant";
import { Branch, BranchStates } from "../model/branch";
import { instanceToPlain, plainToInstance } from "class-transformer";

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
                let allBranches = [];
                for (const [branchName, branch] of this.branchState.branches.entries()) {
                    allBranches.push(new Branch(branchName, branch))
                };
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
        WorkState.update(BRANCHES_KEY, JSON.stringify(instanceToPlain(this.branchState)));
        this.refresh();
    }

    // TODO: fixme 
    reloadState() {
        const defaultState = new BranchStates();
        const s = WorkState.get(BRANCHES_KEY, JSON.stringify(instanceToPlain(defaultState)));
        const newState = plainToInstance(BranchStates, JSON.parse(s));
        // hot fix of the iconPath problem
        for (const [branchName, state] of newState.branches.entries()) {
            for (const [k, group] of state.groups) {
                group.setPin(group.isPinned());
                for (const tab of group.getTabs()) {
                    tab.setDefaultIcon();
                }
            }
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
        WorkState.update(BRANCHES_KEY, JSON.stringify(instanceToPlain(this.branchState)));
        this._onDidChangeTreeData.fire();
    }

    public refresh() {
        this._onDidChangeTreeData.fire();
    }
}