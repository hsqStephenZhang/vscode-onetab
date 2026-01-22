// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { TabsGroup } from "../../../model/tabsgroup";
import { TabItem } from "../../../model/tabitem";
import { DEFAULT_TAB_GROUP_LABEL } from "../../../constant";
import { setupTestGlobals, resetTestState } from "../testHelper";

suite("TabsGroup Test Suite", () => {
  suiteSetup(() => {
    setupTestGlobals();
  });

  setup(() => {
    resetTestState();
  });

  test("should create TabsGroup with default values", () => {
    const group = new TabsGroup();

    assert.ok(group.id);
    assert.ok(group.label);
    assert.ok(
      (group.label as string).startsWith(
        DEFAULT_TAB_GROUP_LABEL.replace(" ", ""),
      ) || (group.label as string).includes("untitled"),
    );
    assert.ok(group.createTime > 0);
    assert.strictEqual(group.isPinned(), false);
    assert.deepStrictEqual(group.getTags(), []);
    assert.deepStrictEqual(group.getTabs(), []);
    assert.strictEqual(
      group.collapsibleState,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
  });

  test("should create TabsGroup with custom id and label", () => {
    const group = new TabsGroup("custom-id", "Custom Label");

    assert.strictEqual(group.id, "custom-id");
    assert.strictEqual(group.getLabel(), "Custom Label");
  });

  test("should pin and unpin group correctly", () => {
    const group = new TabsGroup();

    assert.strictEqual(group.isPinned(), false);

    group.setPin(true);
    assert.strictEqual(group.isPinned(), true);

    group.setPin(false);
    assert.strictEqual(group.isPinned(), false);
  });

  test("should manage tags correctly", () => {
    const group = new TabsGroup();

    group.setTags(["tag1", "tag2"]);
    assert.deepStrictEqual(group.getTags(), ["tag1", "tag2"]);

    group.extendTags(["tag3"]);
    assert.deepStrictEqual(group.getTags(), ["tag1", "tag2", "tag3"]);
  });

  test("should manage tabs correctly", () => {
    const group = new TabsGroup("group-id", "Test Group");
    const tab1 = new TabItem(
      vscode.Uri.file("/path/file1.ts"),
      "tab1",
      "file1.ts",
    );
    const tab2 = new TabItem(
      vscode.Uri.file("/path/file2.ts"),
      "tab2",
      "file2.ts",
    );

    group.setTabs([tab1, tab2]);

    assert.strictEqual(group.getTabs().length, 2);
    assert.strictEqual(group.getTabs()[0].parentId, "group-id");
    assert.strictEqual(group.getTabs()[1].parentId, "group-id");
  });

  test("should push tab correctly", () => {
    const group = new TabsGroup("group-id");
    const tab = new TabItem(
      vscode.Uri.file("/path/file.ts"),
      "tab1",
      "file.ts",
    );

    group.pushTab(tab);

    assert.strictEqual(group.getTabs().length, 1);
    assert.strictEqual(tab.parentId, "group-id");
  });

  test("should extend tabs correctly", () => {
    const group = new TabsGroup("group-id");
    const tab1 = new TabItem(
      vscode.Uri.file("/path/file1.ts"),
      "tab1",
      "file1.ts",
    );
    group.setTabs([tab1]);

    const tab2 = new TabItem(
      vscode.Uri.file("/path/file2.ts"),
      "tab2",
      "file2.ts",
    );
    const tab3 = new TabItem(
      vscode.Uri.file("/path/file3.ts"),
      "tab3",
      "file3.ts",
    );

    group.extendTabs([tab2, tab3]);

    assert.strictEqual(group.getTabs().length, 3);
    assert.strictEqual(tab2.parentId, "group-id");
    assert.strictEqual(tab3.parentId, "group-id");
  });

  test("should remove duplicate tabs correctly", () => {
    const group = new TabsGroup("group-id");
    const tab1 = new TabItem(
      vscode.Uri.file("/path/file1.ts"),
      "tab1",
      "file1.ts",
    );
    const tab2 = new TabItem(
      vscode.Uri.file("/path/file1.ts"),
      "tab2",
      "file1.ts",
    ); // duplicate path
    const tab3 = new TabItem(
      vscode.Uri.file("/path/file2.ts"),
      "tab3",
      "file2.ts",
    );

    group.setTabs([tab1, tab2, tab3]);
    group.removeDuplicateTabs();

    assert.strictEqual(group.getTabs().length, 2);
  });

  test("should deep clone group correctly", () => {
    const group = new TabsGroup("original-id", "Original");
    group.setPin(true);
    group.setTags(["tag1"]);
    const tab = new TabItem(
      vscode.Uri.file("/path/file.ts"),
      "tab1",
      "file.ts",
    );
    group.setTabs([tab]);

    const cloned = group.deepClone();

    assert.notStrictEqual(cloned.id, group.id);
    assert.strictEqual(cloned.getLabel(), group.getLabel());
    assert.strictEqual(cloned.isPinned(), group.isPinned());
    assert.deepStrictEqual(cloned.getTags(), group.getTags());
    assert.strictEqual(cloned.getTabs().length, 1);
    assert.strictEqual(cloned.getTabs()[0].parentId, cloned.id);
  });

  test("should check if untitled correctly", () => {
    // Use the actual DEFAULT_TAB_GROUP_LABEL constant to create an "untitled" group
    const group1 = new TabsGroup("id1", DEFAULT_TAB_GROUP_LABEL + "1");
    assert.strictEqual(group1.isUntitled(), true);

    const group2 = new TabsGroup("id2", "My Custom Group");
    assert.strictEqual(group2.isUntitled(), false);
  });

  test("should get children correctly", () => {
    const group = new TabsGroup();
    const tab1 = new TabItem(
      vscode.Uri.file("/path/file1.ts"),
      "tab1",
      "file1.ts",
    );
    const tab2 = new TabItem(
      vscode.Uri.file("/path/file2.ts"),
      "tab2",
      "file2.ts",
    );
    group.setTabs([tab1, tab2]);

    const children = group.getChildren();

    assert.strictEqual((children as TabItem[]).length, 2);
  });
});
