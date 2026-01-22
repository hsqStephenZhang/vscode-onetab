// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import {
  tabIsTextInput,
  getTabUri,
  isSaveableTab,
  tabIsSaveable,
} from "../../../utils/tab";

suite("Tab Utils Test Suite", () => {
  // ==========================================
  // getTabUri Tests
  // ==========================================

  suite("getTabUri", () => {
    test("should extract URI from TabInputText", () => {
      const uri = vscode.Uri.file("/path/to/file.ts");
      const mockTab = {
        input: new vscode.TabInputText(uri),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result?.path, uri.path);
    });

    test("should extract modified URI from TabInputTextDiff", () => {
      const original = vscode.Uri.file("/path/to/file.original.ts");
      const modified = vscode.Uri.file("/path/to/file.modified.ts");
      const mockTab = {
        input: new vscode.TabInputTextDiff(original, modified),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result?.path, modified.path);
    });

    test("should extract URI from TabInputCustom", () => {
      const uri = vscode.Uri.file("/path/to/image.png");
      const mockTab = {
        input: new vscode.TabInputCustom(uri, "imagePreview.view"),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result?.path, uri.path);
    });

    test("should extract URI from TabInputNotebook", () => {
      const uri = vscode.Uri.file("/path/to/notebook.ipynb");
      const mockTab = {
        input: new vscode.TabInputNotebook(uri, "jupyter-notebook"),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result?.path, uri.path);
    });

    test("should extract modified URI from TabInputNotebookDiff", () => {
      const original = vscode.Uri.file("/path/to/notebook.original.ipynb");
      const modified = vscode.Uri.file("/path/to/notebook.modified.ipynb");
      const mockTab = {
        input: new vscode.TabInputNotebookDiff(
          original,
          modified,
          "jupyter-notebook",
        ),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result?.path, modified.path);
    });

    test("should return undefined for TabInputWebview", () => {
      const mockTab = {
        input: new vscode.TabInputWebview("webview-id"),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result, undefined);
    });

    test("should return undefined for TabInputTerminal", () => {
      const mockTab = {
        input: new vscode.TabInputTerminal(),
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result, undefined);
    });

    test("should return undefined for unknown input type", () => {
      const mockTab = {
        input: { unknown: true },
      } as vscode.Tab;

      const result = getTabUri(mockTab);
      assert.strictEqual(result, undefined);
    });
  });

  // ==========================================
  // isSaveableTab Tests
  // ==========================================

  suite("isSaveableTab", () => {
    test("should return true for TabInputText", () => {
      const mockTab = {
        input: new vscode.TabInputText(vscode.Uri.file("/file.ts")),
      } as vscode.Tab;

      assert.strictEqual(isSaveableTab(mockTab), true);
    });

    test("should return true for TabInputTextDiff", () => {
      const mockTab = {
        input: new vscode.TabInputTextDiff(
          vscode.Uri.file("/a.ts"),
          vscode.Uri.file("/b.ts"),
        ),
      } as vscode.Tab;

      assert.strictEqual(isSaveableTab(mockTab), true);
    });

    test("should return true for TabInputNotebook", () => {
      const mockTab = {
        input: new vscode.TabInputNotebook(
          vscode.Uri.file("/notebook.ipynb"),
          "jupyter-notebook",
        ),
      } as vscode.Tab;

      assert.strictEqual(isSaveableTab(mockTab), true);
    });

    test("should return false for TabInputTerminal", () => {
      const mockTab = {
        input: new vscode.TabInputTerminal(),
      } as vscode.Tab;

      assert.strictEqual(isSaveableTab(mockTab), false);
    });

    test("should return false for TabInputWebview", () => {
      const mockTab = {
        input: new vscode.TabInputWebview("some-id"),
      } as vscode.Tab;

      assert.strictEqual(isSaveableTab(mockTab), false);
    });
  });

  // ==========================================
  // tabIsTextInput Tests (backward compatibility)
  // ==========================================

  suite("tabIsTextInput", () => {
    test("should return true for TabInputText", () => {
      const mockTab = {
        input: new vscode.TabInputText(vscode.Uri.file("/file.ts")),
      } as vscode.Tab;

      assert.strictEqual(tabIsTextInput(mockTab), true);
    });

    test("should return false for TabInputNotebook", () => {
      const mockTab = {
        input: new vscode.TabInputNotebook(
          vscode.Uri.file("/notebook.ipynb"),
          "jupyter-notebook",
        ),
      } as vscode.Tab;

      assert.strictEqual(tabIsTextInput(mockTab), false);
    });
  });
});
