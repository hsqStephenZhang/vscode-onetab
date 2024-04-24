import * as vscode from 'vscode';
import { Global } from '../global';
import { API } from '../typeings/git';
import { DEFAULT_BRANCH_NAME } from '../constant';
import { GitExtension } from "../typeings/git";

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

// our file watcher to monitor the changes under `.git` folder
// used to detect the initialization of git repository
export class GitFileWatcher {
    private watcher: vscode.FileSystemWatcher;

    constructor() {
        this.watcher = vscode.workspace.createFileSystemWatcher(
            "**/*",
            false,
            false,
            false
        );
        this.watcher.onDidCreate((uri) => {
            // the creation of .git folder
            if (uri.fsPath.endsWith(pattern)) {
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
