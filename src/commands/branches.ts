import * as vscode from "vscode";
import { Global } from "../common/global";
import { Branch } from "../model/main/branch";

export function archieve() {
    let activeState = Global.tabsProvider.getState();
    let activeBranchName = Global.branchName;
    Global.branchesProvider.insertOrUpdateBranch(activeBranchName, activeState);
    Global.tabsProvider.clearState();
}

export function pickAndClone() {
    let allBranchNames = Global.branchesProvider.allBranches();
    let items: vscode.QuickPickItem[] = allBranchNames.map((branchName) => {
        return {
            label: branchName,
        };
    });
    vscode.window.showQuickPick(items).then((selection) => {
        if (selection) {
            let branchName = selection.label;
            let branchState = Global.branchesProvider.getBranchState(branchName);
            if (branchState) {
                let newBranchState = branchState.deepClone();
                Global.tabsProvider.resetState(newBranchState);
            }
        }
    })
}

export function cloneBranch(branch: Branch) {
    Global.logger.debug(`Restoring branch: ${branch.label}`);
    let newBranchState = branch.tabsState.deepClone();
    Global.tabsProvider.resetState(newBranchState);
}
