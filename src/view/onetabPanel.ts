// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import path = require("path");
import { Global } from "../common/global";
import { Message } from './message';

export class OnetabPanel {
  public static instance: OnetabPanel | undefined;

  public static readonly viewType = "onetab app";

  private _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _extensionUri: vscode.Uri;

  constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._panel = panel;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage((message) => {
      Global.logger.debug("message from webview: " + message.text);

      this._panel.webview.postMessage({
        type: "pong",
        text: "hello from extension",
      });
    });
  }

  public static createOrShow(extensionUri: vscode.Uri) {
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
      "onetab app",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionUri.path, "out", "app")),
        ],
      }
    );

    OnetabPanel.instance = new OnetabPanel(panel, extensionUri);
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
    const bundleScriptPath = this._panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this._extensionUri.path, "out", "app", "bundle.js")
      )
    );

    return `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>React App</title>
        </head>
    
        <body>
          <div id="root"></div>
          <script src="${bundleScriptPath}"></script>
        </body>
      </html>
    `;
  }

  // message

  public static postMessage(uri: vscode.Uri, message: Message) {
    OnetabPanel.createOrShow(uri);
    if (OnetabPanel.instance) {
      OnetabPanel.instance._panel.webview.postMessage(message);
    }
  }
}
