import * as vscode from 'vscode';
import { Global } from '../common/global';
import { API } from '../typeings/git';
import { DEFAULT_BRANCH_NAME } from '../constant';

export function reinitGitBranchGroups(git: API): vscode.Disposable | void {
    if (git.repositories.length === 0) { return; }

    const repo = git.repositories[0];
    let latestBranch = repo.state.HEAD?.name;
    Global.branchName = latestBranch || DEFAULT_BRANCH_NAME;
    Global.logger.debug(`reinitGitBranchGroups, current Branch: ${latestBranch}`);
    return repo.state.onDidChange(async () => {
        if (repo.state.HEAD?.name !== Global.branchName) {
            Global.logger.debug(`Branch changed, from: ${Global.branchName}, to: ${repo.state.HEAD?.name}`);

            // do the state switch
            let activeState = Global.tabsProvider.getState();
            let activeBranchName = Global.branchName;
            Global.branchName = repo.state.HEAD?.name || DEFAULT_BRANCH_NAME;
            Global.branchesProvider.insertOrUpdateBranch(activeBranchName, activeState);
            let newState = Global.branchesProvider.getBranchState(Global.branchName);
            if (newState) {
                Global.tabsProvider.resetState(newState);
            } else {
                Global.tabsProvider.clearState();
            }
        }
    })
}