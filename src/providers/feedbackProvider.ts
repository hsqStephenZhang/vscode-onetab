import * as vscode from 'vscode';
import { Link } from '../model/feedback';
import { FeedBackItem } from '../model/feedback';


/// TreeDataProvider for the feedback view in sidebar
export class FeedbackProvider
    implements
    vscode.TreeDataProvider<FeedBackItem> {

    public items: FeedBackItem[];

    private _onDidChangeTreeData: vscode.EventEmitter<FeedBackItem | undefined | void> =
        new vscode.EventEmitter<FeedBackItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined | void> =
        this._onDidChangeTreeData.event;
    getTreeItem(element: FeedBackItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(_element?: FeedBackItem | undefined): vscode.ProviderResult<FeedBackItem[]> {
        return new Promise(resolve => {
            resolve(this.items);
        });
    }

    /// the viedId should be the same with the viewId in the package.json
    /// and please make sure the command `${viewId}.openHelpLink` has been registered in the package.json
    constructor(context: vscode.ExtensionContext, viewId: string, links: Link[]) {
        registerOpenUrlCommand(context, viewId);
        let view = vscode.window.createTreeView(viewId, { treeDataProvider: this });
        context.subscriptions.push(view);

        this.items = links.map(item => new FeedBackItem(item.label, vscode.TreeItemCollapsibleState.None, {
            title: item.label,
            command: `${viewId}.openHelpLink`,
            arguments: [item.url]
        }, new vscode.ThemeIcon(item.icon)));
    }
}

function registerOpenUrlCommand(context: vscode.ExtensionContext, viewId: string) {
    const disp = vscode.commands.registerCommand(`${viewId}.openHelpLink`, (url: string) => {
        vscode.env.openExternal(vscode.Uri.parse(url));
    });
    context.subscriptions.push(disp);
}