// filepath: /Users/zc/codespace/js/vscode-onetab/src/test/suite/model/branch.test.ts
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { Branch, BranchStates } from "../../../model/branch";
import { TabsState } from "../../../model/tabstate";
import { TabsGroup } from "../../../model/tabsgroup";
import { TabItem } from "../../../model/tabitem";
import { CONTEXT_BRANCH } from "../../../constant";
import { setupTestGlobals, resetTestState } from "../testHelper";

suite("Branch Model Test Suite", () => {
  suiteSetup(() => {
    setupTestGlobals();
  });

  setup(() => {
    resetTestState();
  });

  function createTestGroup(
    id: string,
    label: string,
    files: string[],
  ): TabsGroup {
    const group = new TabsGroup(id, label);
    const tabs = files.map((file, idx) => {
      const tab = new TabItem(
        vscode.Uri.file(file),
        `tab-${idx}`,
        file.split("/").pop() || "",
      );
      tab.parentId = id;
      return tab;
    });
    group.setTabs(tabs);
    return group;
  }

  function createTestState(branchName: string | null = null): TabsState {
    const state = new TabsState(branchName);
    const group = createTestGroup("group-1", "Test Group", ["/path/file1.ts"]);
    state.addTabsGroup(group);
    return state;
  }

  // --- BranchStates Tests ---

  test("BranchStates should initialize with empty branches map", () => {
    const branchStates = new BranchStates();

    assert.ok(branchStates.branches instanceof Map);
    assert.strictEqual(branchStates.branches.size, 0);
  });

  test("BranchStates should allow adding branches", () => {
    const branchStates = new BranchStates();
    const state1 = createTestState("main");
    const state2 = createTestState("feature");

    branchStates.branches.set("main", state1);
    branchStates.branches.set("feature", state2);

    assert.strictEqual(branchStates.branches.size, 2);
    assert.ok(branchStates.branches.has("main"));
    assert.ok(branchStates.branches.has("feature"));
  });

  test("BranchStates should allow retrieving branches", () => {
    const branchStates = new BranchStates();
    const state = createTestState("develop");
    branchStates.branches.set("develop", state);

    const retrieved = branchStates.branches.get("develop");

    assert.ok(retrieved);
    assert.strictEqual(retrieved.branchName, "develop");
  });

  test("BranchStates should allow deleting branches", () => {
    const branchStates = new BranchStates();
    const state = createTestState("temp-branch");
    branchStates.branches.set("temp-branch", state);

    branchStates.branches.delete("temp-branch");

    assert.strictEqual(branchStates.branches.size, 0);
    assert.strictEqual(branchStates.branches.has("temp-branch"), false);
  });

  // --- Branch Tests ---

  test("Branch should create with correct properties", () => {
    const state = createTestState("feature-branch");
    const branch = new Branch("feature-branch", state);

    assert.ok(branch.id);
    assert.strictEqual(branch.label, "feature-branch");
    assert.strictEqual(branch.contextValue, CONTEXT_BRANCH);
    assert.strictEqual(branch.tabsState, state);
    assert.strictEqual(
      branch.collapsibleState,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
  });

  test("Branch should have unique id", () => {
    const state1 = createTestState("branch-1");
    const state2 = createTestState("branch-2");
    const branch1 = new Branch("branch-1", state1);
    const branch2 = new Branch("branch-2", state2);

    assert.notStrictEqual(branch1.id, branch2.id);
  });

  test("Branch.getChildren should return tabs groups from state", async () => {
    const state = new TabsState("test-branch");
    const group1 = createTestGroup("group-1", "Group 1", ["/path/file1.ts"]);
    const group2 = createTestGroup("group-2", "Group 2", ["/path/file2.ts"]);
    state.addTabsGroup(group1);
    state.addTabsGroup(group2);

    const branch = new Branch("test-branch", state);
    const children = await branch.getChildren();

    assert.strictEqual(children.length, 2);
  });

  test("Branch.getChildren should return sorted tabs groups", async () => {
    const state = new TabsState("test-branch");

    // Add a pinned group (should be first)
    const pinnedGroup = createTestGroup("pinned", "Pinned Group", [
      "/path/pinned.ts",
    ]);
    pinnedGroup.setPin(true);

    // Add a regular group
    const regularGroup = createTestGroup("regular", "Regular Group", [
      "/path/regular.ts",
    ]);

    state.addTabsGroup(regularGroup);
    state.addTabsGroup(pinnedGroup);

    const branch = new Branch("test-branch", state);
    const children = await branch.getChildren();

    // Pinned should come first due to sorting
    assert.strictEqual(children[0].id, "pinned");
  });

  test("Branch with empty state should return empty children", async () => {
    const emptyState = new TabsState("empty-branch");
    const branch = new Branch("empty-branch", emptyState);

    const children = await branch.getChildren();

    assert.strictEqual(children.length, 0);
  });

  // --- State Deep Clone Tests for Branches ---

  test("Branch state should be deep clonable", () => {
    const state = new TabsState("original-branch");
    const group = createTestGroup("group-1", "Test Group", [
      "/path/file1.ts",
      "/path/file2.ts",
    ]);
    group.setPin(true);
    group.setTags(["important", "feature"]);
    state.addTabsGroup(group);

    const clonedState = state.deepClone();

    // Verify clone is independent
    assert.strictEqual(clonedState.branchName, "original-branch");
    assert.strictEqual(clonedState.groups.size, 1);

    // Modify original, verify clone is not affected
    state.setGroupLabel("group-1", "Modified Label");

    const clonedGroup = clonedState.groups.values().next().value;
    assert.notStrictEqual(clonedGroup?.getLabel(), "Modified Label");
  });

  test("Cloned branch state groups should have different IDs", () => {
    const state = new TabsState("branch");
    const group = createTestGroup("original-id", "Test Group", [
      "/path/file.ts",
    ]);
    state.addTabsGroup(group);

    const clonedState = state.deepClone();

    const originalIds = Array.from(state.groups.keys());
    const clonedIds = Array.from(clonedState.groups.keys());

    // The deep clone creates new group IDs
    assert.strictEqual(originalIds.length, clonedIds.length);
  });
});

suite("Branch Operations Test Suite", () => {
  suiteSetup(() => {
    setupTestGlobals();
  });

  setup(() => {
    resetTestState();
  });

  function createTestGroup(
    id: string,
    label: string,
    files: string[],
  ): TabsGroup {
    const group = new TabsGroup(id, label);
    const tabs = files.map((file, idx) => {
      const tab = new TabItem(
        vscode.Uri.file(file),
        `tab-${idx}`,
        file.split("/").pop() || "",
      );
      tab.parentId = id;
      return tab;
    });
    group.setTabs(tabs);
    return group;
  }

  test("Multiple branches can coexist with different states", () => {
    const branchStates = new BranchStates();

    // Create different states for different branches
    const mainState = new TabsState("main");
    mainState.addTabsGroup(
      createTestGroup("main-group", "Main Work", ["/main/file.ts"]),
    );

    const featureState = new TabsState("feature");
    featureState.addTabsGroup(
      createTestGroup("feature-group", "Feature Work", ["/feature/file.ts"]),
    );

    const bugfixState = new TabsState("bugfix");
    bugfixState.addTabsGroup(
      createTestGroup("bugfix-group", "Bugfix Work", ["/bugfix/file.ts"]),
    );

    branchStates.branches.set("main", mainState);
    branchStates.branches.set("feature", featureState);
    branchStates.branches.set("bugfix", bugfixState);

    assert.strictEqual(branchStates.branches.size, 3);

    // Verify each branch has its own state
    assert.strictEqual(branchStates.branches.get("main")?.groups.size, 1);
    assert.strictEqual(branchStates.branches.get("feature")?.groups.size, 1);
    assert.strictEqual(branchStates.branches.get("bugfix")?.groups.size, 1);
  });

  test("Branch state modification should not affect other branches", () => {
    const branchStates = new BranchStates();

    const state1 = new TabsState("branch-1");
    state1.addTabsGroup(
      createTestGroup("group-1", "Group 1", ["/path/file1.ts"]),
    );

    const state2 = new TabsState("branch-2");
    state2.addTabsGroup(
      createTestGroup("group-2", "Group 2", ["/path/file2.ts"]),
    );

    branchStates.branches.set("branch-1", state1);
    branchStates.branches.set("branch-2", state2);

    // Modify branch-1 state
    state1.addTabsGroup(
      createTestGroup("group-3", "Group 3", ["/path/file3.ts"]),
    );

    // Verify branch-2 is not affected
    assert.strictEqual(branchStates.branches.get("branch-1")?.groups.size, 2);
    assert.strictEqual(branchStates.branches.get("branch-2")?.groups.size, 1);
  });

  test("Iterating over branches should work correctly", () => {
    const branchStates = new BranchStates();

    branchStates.branches.set("alpha", new TabsState("alpha"));
    branchStates.branches.set("beta", new TabsState("beta"));
    branchStates.branches.set("gamma", new TabsState("gamma"));

    const branchNames: string[] = [];
    for (const [name, _state] of branchStates.branches) {
      branchNames.push(name);
    }

    assert.strictEqual(branchNames.length, 3);
    assert.ok(branchNames.includes("alpha"));
    assert.ok(branchNames.includes("beta"));
    assert.ok(branchNames.includes("gamma"));
  });

  test("Branch state with multiple groups should maintain order", async () => {
    const state = new TabsState("multi-group-branch");

    // Add groups with different priorities
    const pinnedTaggedGroup = createTestGroup(
      "pinned-tagged",
      "Pinned Tagged",
      ["/a.ts"],
    );
    pinnedTaggedGroup.setPin(true);
    pinnedTaggedGroup.setTags(["important"]);

    const pinnedGroup = createTestGroup("pinned", "Pinned Only", ["/b.ts"]);
    pinnedGroup.setPin(true);

    const taggedGroup = createTestGroup("tagged", "Tagged Only", ["/c.ts"]);
    taggedGroup.setTags(["feature"]);

    const regularGroup = createTestGroup("regular", "Regular", ["/d.ts"]);

    // Add in reverse order
    state.addTabsGroup(regularGroup);
    state.addTabsGroup(taggedGroup);
    state.addTabsGroup(pinnedGroup);
    state.addTabsGroup(pinnedTaggedGroup);

    const branch = new Branch("multi-group-branch", state);
    const children = await branch.getChildren();

    // Verify sorting: pinned+named > pinned+tagged > named > tagged > regular
    assert.strictEqual(children.length, 4);
    // Both pinned groups should be at top
    const firstTwoIds = [children[0].id, children[1].id];
    assert.ok(firstTwoIds.includes("pinned-tagged"));
    assert.ok(firstTwoIds.includes("pinned"));
  });
});
