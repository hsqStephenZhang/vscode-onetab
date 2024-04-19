import * as vscode from 'vscode';
import { Global } from '../common/global';

let globalFilters: Set<string> = new Set();

interface FilterQuickPickItem extends vscode.QuickPickItem {
    groupID: string;
};

export async function showFilterQuickPick() {
    const items = Array.from(Global.tabsProvider.getState().groups.entries(), entry => {
        return {
            groupID: entry[0],
            label: entry[1].getText(),
        }
    });
    const options: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: "Select a filter to apply to the current view",
        onDidSelectItem: async (selection: FilterQuickPickItem) => {
            if (typeof selection === 'undefined') {
                return;
            }
            const groupItem = selection as FilterQuickPickItem;
            Global.logger.info("Filter selected(0): " + groupItem);
            const group = Global.tabsProvider.getState().groups.get(groupItem.groupID);
            if (typeof group === 'undefined') {
                vscode.window.showErrorMessage("Failed to apply filter: group not found");
                return;
            }
            const treeview = Global.tabsProvider.getTreeView();
            if (typeof treeview === 'undefined') {
                vscode.window.showErrorMessage("Failed to apply filter: treeview not found");
                return;
            }
            await treeview.reveal(group, { select: false, focus: true, expand: true });
        }
    }
    vscode.window.showQuickPick(items, options).then(async (selection) => {
        if (typeof selection === 'undefined') {
            return;
        }
        const groupItem = selection as FilterQuickPickItem;
        const group = Global.tabsProvider.getState().groups.get(groupItem.groupID);
        // const node = Global.tabsProvider.getChildren();
        if (typeof group === 'undefined') {
            vscode.window.showErrorMessage("Failed to apply filter: group not found");
            return;
        }
        Global.logger.info("Filter selected(1): " + groupItem + "group id: {}", group.id);
        const treeview = Global.tabsProvider.getTreeView();
        if (typeof treeview === 'undefined') {
            vscode.window.showErrorMessage("Failed to apply filter: treeview not found");
            return;
        }
        await treeview.reveal(group, { select: false, focus: true, expand: true });
    });
}