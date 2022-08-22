// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";

export class OnetabPanel {
  public static instance: OnetabPanel | undefined;

  public static readonly viewType = "onetabs";

  private _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _extensionUri: vscode.Uri;

  constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._panel = panel;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (OnetabPanel.instance) {
      OnetabPanel.instance._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      OnetabPanel.viewType,
      "onetabs",
      column || vscode.ViewColumn.One,
    );
  }

  private _update() {
    this._panel.title = "onetabs";
    this._panel.webview.html = this._getHtml();
  }

  private dispose() {
    OnetabPanel.instance = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <!--
            Use a content security policy to only allow loading images from https or from our extension directory,
            and only allow scripts that have a specific nonce.
        -->
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cat Coding</title>
    </head>
    <body>
    <h1 id="lines-of-code-counter">0</h1>
    <h1 id="lines-of-code-counter">2</h1>
    </body>
    </html>`;
  }
}
