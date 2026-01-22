import * as vscode from "vscode";
import { Global } from "../global";
import { Branch } from "../model/branch";

export async function archive() {
    // Create a deep clone to preserve the current state independently
    // Use preserveGroupIds=true to keep the same IDs and prevent duplicates
    let activeState = Global.tabsProvider.getState().deepClone(true);
    let activeBranchName = Global.branchName;
    activeState.branchName = activeBranchName;
    Global.branchesProvider.insertOrUpdateBranch(activeBranchName, activeState);
    await Global.tabsProvider.clearState();
}

export function pickAndClone() {
    let allBranchNames = Global.branchesProvider.allBranches();
    let items: vscode.QuickPickItem[] = allBranchNames.map((branchName) => {
        return {
            label: branchName,
        };
    });
    vscode.window.showQuickPick(items).then(async (selection) => {
        if (selection) {
            let branchName = selection.label;
            let branchState = Global.branchesProvider.getBranchState(branchName);
            if (branchState) {
                // Create a deep clone to prevent modifying the stored branch
                let newBranchState = branchState.deepClone();
                await Global.tabsProvider.resetState(newBranchState);
            }
        }
    })
}

export async function cloneBranch(branch: Branch) {
    Global.logger.debug(`Restoring branch: ${branch.label}`);
    // Create a deep clone to prevent modifying the stored branch
    let newBranchState = branch.tabsState.deepClone();
    await Global.tabsProvider.resetState(newBranchState);
}
