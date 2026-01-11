// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { TabItem } from "../../../model/tabitem";
import { DEFAULT_TAB_LABEL } from "../../../constant";

suite("TabItem Test Suite", () => {
  test("should create TabItem with default values", () => {
    const item = new TabItem();
    assert.ok(item.id);
    assert.strictEqual(item.label, DEFAULT_TAB_LABEL);
    assert.ok(item.fileUri);
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
  });

  test("should create TabItem with custom URI and label", () => {
    const uri = vscode.Uri.file("/path/to/file.ts");
    const item = new TabItem(uri, "custom-id", "custom-label");
    
    assert.strictEqual(item.id, "custom-id");
    assert.strictEqual(item.label, "custom-label");
    assert.strictEqual(item.fileUri.fsPath, uri.fsPath);
  });

  test("should deep clone TabItem correctly", () => {
    const uri = vscode.Uri.file("/path/to/file.ts");
    const original = new TabItem(uri, "original-id", "original-label");
    original.parentId = "parent-123";
    
    const cloned = original.deepClone();
    
    assert.notStrictEqual(cloned.id, original.id); // ID should be new
    assert.strictEqual(cloned.getLabel(), original.getLabel());
    assert.strictEqual(cloned.fileUri.fsPath, original.fileUri.fsPath);
    // parentId is not copied by deepClone
  });

  test("should set file URI correctly", () => {
    const item = new TabItem();
    const newUri = vscode.Uri.file("/new/path.ts");
    item.setFileUri(newUri);
    
    assert.strictEqual(item.fileUri.fsPath, newUri.fsPath);
  });

  test("should set label correctly", () => {
    const item = new TabItem();
    item.setLabel("new-label");
    
    assert.strictEqual(item.getLabel(), "new-label");
  });

  test("should create TabItem from row", () => {
    const row = {
      id: "row-id",
      group_id: "group-123",
      label: "row-label",
      file_uri: "file:///path/to/file.ts",
      sort_order: 0,
    };
    
    const item = TabItem.fromRow(row);
    
    assert.strictEqual(item.id, "row-id");
    assert.strictEqual(item.getLabel(), "row-label");
    assert.ok(item.fileUri.fsPath.includes("file.ts"));
  });
});