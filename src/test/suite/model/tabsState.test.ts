// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { TabsState } from "../../../model/tabstate";
import { TabsGroup } from "../../../model/tabsgroup";
import { TabItem } from "../../../model/tabitem";
import { DEFAULT_TAB_GROUP_LABEL } from "../../../constant";
import { setupTestGlobals, resetTestState } from "../testHelper";

suite("TabsState Test Suite", () => {
  suiteSetup(() => {
    setupTestGlobals();
  });

  setup(() => {
    resetTestState();
  });

  function createTestGroup(id: string, label: string, files: string[]): TabsGroup {
    const group = new TabsGroup(id, label);
    const tabs = files.map((file, idx) => {
      const tab = new TabItem(vscode.Uri.file(file), `tab-${idx}`, file.split("/").pop() || "");
      tab.parentId = id;
      return tab;
    });
    group.setTabs(tabs);
    return group;
  }

  test("should create empty TabsState", () => {
    const state = new TabsState();
    
    assert.strictEqual(state.groups.size, 0);
    assert.strictEqual(state.blackList.size, 0);
    assert.strictEqual(state.branchName, null);
  });

  test("should create TabsState with branch name", () => {
    const state = new TabsState("feature-branch");
    
    assert.strictEqual(state.branchName, "feature-branch");
  });

  test("should add and get tabs group", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    
    state.addTabsGroup(group);
    
    assert.strictEqual(state.groups.size, 1);
    assert.strictEqual(state.getGroup("group-1")?.getLabel(), "Test Group");
  });

  test("should remove tabs group", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    state.removeTabsGroup("group-1");
    
    assert.strictEqual(state.groups.size, 0);
  });

  test("should not remove pinned group with tryRemoveTabsGroup", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Pinned Group", ["/path/file1.ts"]);
    group.setPin(true);
    state.addTabsGroup(group);
    
    state.tryRemoveTabsGroup("group-1");
    
    assert.strictEqual(state.groups.size, 1);
  });

  test("should remove unpinned group with tryRemoveTabsGroup", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Unpinned Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    state.tryRemoveTabsGroup("group-1");
    
    assert.strictEqual(state.groups.size, 0);
  });

  test("should set group pinned status", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    state.setPinned("group-1", true);
    
    assert.strictEqual(state.getGroup("group-1")?.isPinned(), true);
  });

  test("should set group label", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Old Label", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    state.setGroupLabel("group-1", "New Label");
    
    assert.strictEqual(state.getGroup("group-1")?.getLabel(), "New Label");
  });

  test("should set group tags", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    state.setGroupTags("group-1", ["tag1", "tag2"]);
    
    assert.deepStrictEqual(state.getGroup("group-1")?.getTags(), ["tag1", "tag2"]);
  });

  test("should add tags to group", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    group.setTags(["existing"]);
    state.addTabsGroup(group);
    
    state.addTagsToGroup("group-1", ["new-tag"]);
    
    assert.deepStrictEqual(state.getGroup("group-1")?.getTags(), ["existing", "new-tag"]);
  });

  test("should add tabs to group", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    const newTab = new TabItem(vscode.Uri.file("/path/file2.ts"), "new-tab", "file2.ts");
    state.addTabsToGroup("group-1", [newTab]);
    
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 2);
  });

  test("should not add duplicate tabs to group", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    const duplicateTab = new TabItem(vscode.Uri.file("/path/file1.ts"), "dup-tab", "file1.ts");
    state.addTabsToGroup("group-1", [duplicateTab]);
    
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 1);
  });

  test("should remove tab from group", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts", "/path/file2.ts"]);
    state.addTabsGroup(group);
    
    state.removeTabFromGroup("group-1", "/path/file1.ts");
    
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 1);
  });

  test("should remove group when last tab is removed", () => {
    const state = new TabsState();
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    
    state.removeTabFromGroup("group-1", "/path/file1.ts");
    
    assert.strictEqual(state.groups.size, 0);
  });

  test("should remove tab from all groups", () => {
    const state = new TabsState();
    const group1 = createTestGroup("group-1", "Group 1", ["/path/file1.ts", "/path/common.ts"]);
    const group2 = createTestGroup("group-2", "Group 2", ["/path/file2.ts", "/path/common.ts"]);
    state.addTabsGroup(group1);
    state.addTabsGroup(group2);
    
    state.removeTabFromAllGroups("/path/common.ts");
    
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 1);
    assert.strictEqual(state.getGroup("group-2")?.getTabs().length, 1);
  });

  test("should merge tabs groups", () => {
    const state = new TabsState();
    const group1 = createTestGroup("group-1", "Group 1", ["/path/file1.ts"]);
    const group2 = createTestGroup("group-2", "Group 2", ["/path/file2.ts"]);
    state.addTabsGroup(group1);
    state.addTabsGroup(group2);
    
    state.mergeTabsGroup("group-1", ["group-2"]);
    
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 2);
    assert.strictEqual(state.groups.size, 1); // group-2 should be removed
  });

  test("should get pinned lists", () => {
    const state = new TabsState();
    const pinnedGroup = createTestGroup("pinned", "Pinned", ["/path/file1.ts"]);
    pinnedGroup.setPin(true);
    const unpinnedGroup = createTestGroup("unpinned", "Unpinned", ["/path/file2.ts"]);
    state.addTabsGroup(pinnedGroup);
    state.addTabsGroup(unpinnedGroup);
    
    const pinnedLists = state.getPinnedLists();
    
    assert.strictEqual(pinnedLists.length, 1);
    assert.strictEqual(pinnedLists[0].id, "pinned");
  });

  test("should get titled lists", () => {
    const state = new TabsState();
    const titledGroup = createTestGroup("titled", "My Custom Name", ["/path/file1.ts"]);
    // Use the actual constant for an untitled group
    const untitledGroup = createTestGroup("untitled", DEFAULT_TAB_GROUP_LABEL + " 1", ["/path/file2.ts"]);
    state.addTabsGroup(titledGroup);
    state.addTabsGroup(untitledGroup);
    
    const titledLists = state.getTitledLists();
    
    assert.strictEqual(titledLists.length, 1);
    assert.strictEqual(titledLists[0].id, "titled");
  });

  test("should get tagged lists", () => {
    const state = new TabsState();
    const taggedGroup = createTestGroup("tagged", "Tagged", ["/path/file1.ts"]);
    taggedGroup.setTags(["important"]);
    const untaggedGroup = createTestGroup("untagged", "Untagged", ["/path/file2.ts"]);
    state.addTabsGroup(taggedGroup);
    state.addTabsGroup(untaggedGroup);
    
    const taggedLists = state.getTaggedLists();
    
    assert.strictEqual(taggedLists.length, 1);
    assert.strictEqual(taggedLists[0].id, "tagged");
  });

  test("should filter groups", () => {
    const state = new TabsState();
    const pinnedTaggedGroup = createTestGroup("group-1", "Pinned Tagged", ["/path/file1.ts"]);
    pinnedTaggedGroup.setPin(true);
    pinnedTaggedGroup.setTags(["important"]);
    
    const unpinnedGroup = createTestGroup("group-2", "Unpinned", ["/path/file2.ts"]);
    
    state.addTabsGroup(pinnedTaggedGroup);
    state.addTabsGroup(unpinnedGroup);
    
    const filtered = state.filter([
      (g) => g.isPinned(),
      (g) => g.getTags().length > 0,
    ]);
    
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, "group-1");
  });

  test("should sort groups correctly (pinned > named > tagged > time)", () => {
    const state = new TabsState();
    
    // Use DEFAULT_TAB_GROUP_LABEL to create a truly untitled group
    const unpinnedUntitled = createTestGroup("untitled", DEFAULT_TAB_GROUP_LABEL + " 100", ["/path/file4.ts"]);
    const pinnedGroup = createTestGroup("pinned", "Custom Name", ["/path/file1.ts"]);
    pinnedGroup.setPin(true);
    const namedGroup = createTestGroup("named", "Custom Name 2", ["/path/file2.ts"]);
    // Tagged group with untitled-style name (so only tagged score applies)
    const taggedGroup = createTestGroup("tagged", DEFAULT_TAB_GROUP_LABEL + " 200", ["/path/file3.ts"]);
    taggedGroup.setTags(["tag1"]);
    
    state.addTabsGroup(unpinnedUntitled);
    state.addTabsGroup(namedGroup);
    state.addTabsGroup(taggedGroup);
    state.addTabsGroup(pinnedGroup);
    
    const sorted = state.getAllTabsGroupsSorted();
    
    // Pinned + named = 110
    assert.strictEqual(sorted[0].id, "pinned");
    // Named only = 10
    assert.strictEqual(sorted[1].id, "named");
    // Tagged only (untitled name) = 1
    assert.strictEqual(sorted[2].id, "tagged");
    // Untitled, no tags = 0
    assert.strictEqual(sorted[3].id, "untitled");
  });

  test("should deep clone state", () => {
    const state = new TabsState("main");
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    group.setPin(true);
    group.setTags(["tag1"]);
    state.addTabsGroup(group);
    state.blackList.add("*.log");
    
    const cloned = state.deepClone();
    
    assert.strictEqual(cloned.branchName, "main");
    assert.strictEqual(cloned.groups.size, 1);
    assert.strictEqual(cloned.blackList.size, 1);
    
    // Modify original, cloned should not change
    state.setGroupLabel("group-1", "Modified");
    assert.strictEqual(cloned.getGroup(cloned.groups.keys().next().value!)?.getLabel(), "Test Group");
  });
});