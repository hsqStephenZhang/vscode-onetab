import * as vscode from 'vscode';
import { Global } from '../global';
import { API } from '../typings/git';
import { DEFAULT_BRANCH_NAME } from '../constant';
import { GitExtension } from "../typings/git";

const pattern = "/.git";

// the git branch change listener, uses vscode's git API to monitor and switch the state
export function reinitGitBranchGroups(git: API): vscode.Disposable | void {
    if (git.repositories.length === 0) { return; }

    const repo = git.repositories[0];
    let latestBranch = repo.state.HEAD?.name;
    Global.branchName = latestBranch || DEFAULT_BRANCH_NAME;
    Global.logger.debug(`reinitGitBranchGroups, current Branch: ${latestBranch}`);
    return repo.state.onDidChange(async () => {
        if (repo.state.HEAD?.name !== Global.branchName) {
            Global.logger.debug(`Branch changed, from: ${Global.branchName}, to: ${repo.state.HEAD?.name}`);

            // Save current state to DB under the old branch name
            let activeBranchName = Global.branchName;
            let activeState = Global.tabsProvider.getState();
            activeState.branchName = activeBranchName;
            await activeState.saveToDb();

            // Update to new branch
            Global.branchName = repo.state.HEAD?.name || DEFAULT_BRANCH_NAME;

            // Reload branches provider to reflect the saved branch
            Global.branchesProvider.reloadState();

            // Load fresh state for the new branch from DB (or create empty)
            let newState = Global.branchesProvider.getBranchState(Global.branchName);
            if (newState) {
                // Remove from branches since it's now active
                Global.branchesProvider.deleteBranch(Global.branchName);
                Global.tabsProvider.resetState(newState);
            } else {
                Global.tabsProvider.clearState();
            }
        }
    })
}

// our file watcher to monitor the changes under `.git` folder
// used to detect the initialization of git repository
export class GitFileWatcher {
    private watcher: vscode.FileSystemWatcher;

    constructor() {
        this.watcher = vscode.workspace.createFileSystemWatcher(
            "**/.git{,/**}"
        );
        this.watcher.onDidCreate((uri) => {
            // the creation of .git folder
            if (uri.fsPath.endsWith(pattern) || uri.fsPath.includes(pattern + "/")) {
                const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
                const git = gitExtension?.getAPI(1);
                if (git) {
                    Global.logger.debug("initializing git branch groups");
                    reinitGitBranchGroups(git);
                } else {
                    Global.logger.error("failed to get git API");
                }
            }

            Global.logger.debug(uri.fsPath);
        });
        this.watcher.onDidDelete((uri) => {

            // delete of .git folder
            if (uri.fsPath.endsWith(pattern)) {
                Global.branchName = DEFAULT_BRANCH_NAME;
                Global.logger.debug("git folder deleted");
                return;
            }


            // delete of normal files 
            let autoClean = vscode.workspace
                .getConfiguration()
                .get("onetab.autoclean") as boolean;

            Global.logger.debug(uri.fsPath);
            if (autoClean) {
                Global.tabsProvider.updateState((state) => {
                    state.removeTabFromAllGroups(uri.fsPath);
                })
            }
        });
    }
}
