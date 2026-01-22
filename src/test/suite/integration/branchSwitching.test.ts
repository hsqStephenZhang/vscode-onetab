// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { TabsState } from "../../../model/tabstate";
import { TabsGroup } from "../../../model/tabsgroup";
import { TabItem } from "../../../model/tabitem";
import { setupTestGlobals, resetTestState } from "../testHelper";
import { Global } from "../../../global";

suite("Branch Switching Integration Tests", () => {
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

  test("Branch switch should preserve 'from' branch content completely", async () => {
    // Setup: Create a state for branch "feature"
    const featureState = new TabsState("feature");
    const featureGroup = createTestGroup("feature-group-1", "Feature Work", [
      "/feature/file1.ts",
      "/feature/file2.ts",
      "/feature/file3.ts",
    ]);
    featureGroup.setPin(true);
    featureGroup.setTags(["important", "feature"]);
    featureState.addTabsGroup(featureGroup);

    // Save the feature branch state to storage
    await featureState.saveToStorage();

    // Load it back to verify
    const loadedFeatureState = TabsState.loadFromStorage("feature");

    assert.strictEqual(
      loadedFeatureState.groups.size,
      1,
      "Should have 1 group",
    );
    const loadedGroup = Array.from(loadedFeatureState.groups.values())[0];
    assert.strictEqual(
      loadedGroup.getLabel(),
      "Feature Work",
      "Group label should be preserved",
    );
    assert.strictEqual(loadedGroup.getTabs().length, 3, "Should have 3 tabs");
    assert.strictEqual(loadedGroup.isPinned(), true, "Group should be pinned");
    assert.deepStrictEqual(
      loadedGroup.getTags(),
      ["important", "feature"],
      "Tags should be preserved",
    );
  });

  test("Branch switch should create independent copies", async () => {
    // Create original state for branch "main"
    const mainState = new TabsState("main");
    const mainGroup = createTestGroup("main-group", "Main Work", [
      "/main/file1.ts",
      "/main/file2.ts",
    ]);
    mainState.addTabsGroup(mainGroup);
    await mainState.saveToStorage();

    // Load and clone the state
    const loadedState = TabsState.loadFromStorage("main");
    const clonedState = loadedState.deepClone();

    // Modify the cloned state
    const clonedGroup = Array.from(clonedState.groups.values())[0];
    clonedState.setGroupLabel(clonedGroup.id!, "Modified Label");

    // Verify original is unchanged
    const reloadedState = TabsState.loadFromStorage("main");
    const reloadedGroup = Array.from(reloadedState.groups.values())[0];
    assert.strictEqual(
      reloadedGroup.getLabel(),
      "Main Work",
      "Original state should be unchanged",
    );
  });

  test("Switching from branch A to B should preserve all tabs in branch A", async () => {
    // Simulate branch A with multiple groups
    const branchAState = new TabsState("branch-a");

    const group1 = createTestGroup("a-group-1", "Group 1", [
      "/a/file1.ts",
      "/a/file2.ts",
    ]);
    const group2 = createTestGroup("a-group-2", "Group 2", [
      "/a/file3.ts",
      "/a/file4.ts",
    ]);
    const group3 = createTestGroup("a-group-3", "Group 3", ["/a/file5.ts"]);

    group1.setPin(true);
    group2.setTags(["work"]);

    branchAState.addTabsGroup(group1);
    branchAState.addTabsGroup(group2);
    branchAState.addTabsGroup(group3);

    // Save branch A
    await branchAState.saveToStorage();

    // Create and save branch B
    const branchBState = new TabsState("branch-b");
    const groupB = createTestGroup("b-group-1", "Branch B Work", [
      "/b/file1.ts",
    ]);
    branchBState.addTabsGroup(groupB);
    await branchBState.saveToStorage();

    // Load branch A and verify all data is preserved
    const loadedA = TabsState.loadFromStorage("branch-a");
    assert.strictEqual(loadedA.groups.size, 3, "Should have all 3 groups");

    const groups = Array.from(loadedA.groups.values());

    // Find groups by label (since IDs might differ after clone)
    const loadedGroup1 = groups.find((g) => g.getLabel() === "Group 1")!;
    const loadedGroup2 = groups.find((g) => g.getLabel() === "Group 2")!;
    const loadedGroup3 = groups.find((g) => g.getLabel() === "Group 3")!;

    assert.ok(loadedGroup1, "Group 1 should exist");
    assert.ok(loadedGroup2, "Group 2 should exist");
    assert.ok(loadedGroup3, "Group 3 should exist");

    assert.strictEqual(
      loadedGroup1.getTabs().length,
      2,
      "Group 1 should have 2 tabs",
    );
    assert.strictEqual(
      loadedGroup2.getTabs().length,
      2,
      "Group 2 should have 2 tabs",
    );
    assert.strictEqual(
      loadedGroup3.getTabs().length,
      1,
      "Group 3 should have 1 tab",
    );

    assert.strictEqual(
      loadedGroup1.isPinned(),
      true,
      "Group 1 should be pinned",
    );
    assert.deepStrictEqual(
      loadedGroup2.getTags(),
      ["work"],
      "Group 2 tags should be preserved",
    );
  });

  test("Switching back and forth between branches should preserve content", async () => {
    // Create state for branch "develop"
    const developState = new TabsState("develop");
    const developGroup = createTestGroup("develop-group", "Develop", [
      "/dev/api.ts",
      "/dev/utils.ts",
    ]);
    developGroup.setTags(["backend"]);
    developState.addTabsGroup(developGroup);
    await developState.saveToStorage();

    // Create state for branch "hotfix"
    const hotfixState = new TabsState("hotfix");
    const hotfixGroup = createTestGroup("hotfix-group", "Hotfix", [
      "/hotfix/bug.ts",
    ]);
    hotfixGroup.setPin(true);
    hotfixState.addTabsGroup(hotfixGroup);
    await hotfixState.saveToStorage();

    // Switch from develop to hotfix (load hotfix)
    const loadedHotfix = TabsState.loadFromStorage("hotfix");
    assert.strictEqual(
      loadedHotfix.groups.size,
      1,
      "Hotfix should have 1 group",
    );
    const hotfixGrp = Array.from(loadedHotfix.groups.values())[0];
    assert.strictEqual(
      hotfixGrp.isPinned(),
      true,
      "Hotfix group should be pinned",
    );

    // Switch back from hotfix to develop
    const loadedDevelop = TabsState.loadFromStorage("develop");
    assert.strictEqual(
      loadedDevelop.groups.size,
      1,
      "Develop should have 1 group",
    );
    const devGrp = Array.from(loadedDevelop.groups.values())[0];
    assert.strictEqual(
      devGrp.getTabs().length,
      2,
      "Develop group should have 2 tabs",
    );
    assert.deepStrictEqual(
      devGrp.getTags(),
      ["backend"],
      "Develop tags should be preserved",
    );
  });

  test("Deep clone should create completely independent state", () => {
    // Create original state
    const originalState = new TabsState("original");
    const originalGroup = createTestGroup("orig-group", "Original Group", [
      "/orig/file1.ts",
      "/orig/file2.ts",
    ]);
    originalGroup.setPin(true);
    originalGroup.setTags(["test", "original"]);
    originalState.addTabsGroup(originalGroup);

    // Create deep clone
    const clonedState = originalState.deepClone();

    // Modify clone
    const clonedGroup = Array.from(clonedState.groups.values())[0];
    clonedState.setGroupLabel(clonedGroup.id!, "Modified Clone");
    clonedState.setGroupTags(clonedGroup.id!, ["modified"]);
    clonedState.setPinned(clonedGroup.id!, false);

    // Add new tab to clone
    const newTab = new TabItem(
      vscode.Uri.file("/orig/file3.ts"),
      "new-tab",
      "file3.ts",
    );
    newTab.parentId = clonedGroup.id!;
    clonedState.addTabsToGroup(clonedGroup.id!, [newTab]);

    // Verify original is unchanged
    const origGroup = Array.from(originalState.groups.values())[0];
    assert.strictEqual(
      origGroup.getLabel(),
      "Original Group",
      "Original label unchanged",
    );
    assert.deepStrictEqual(
      origGroup.getTags(),
      ["test", "original"],
      "Original tags unchanged",
    );
    assert.strictEqual(
      origGroup.isPinned(),
      true,
      "Original pin status unchanged",
    );
    assert.strictEqual(
      origGroup.getTabs().length,
      2,
      "Original tab count unchanged",
    );
  });

  test("State modification after cloning should not affect source", async () => {
    // Create and save a branch state
    const sourceState = new TabsState("source");
    const sourceGroup = createTestGroup("source-group", "Source", [
      "/src/app.ts",
    ]);
    sourceGroup.setPin(true);
    sourceState.addTabsGroup(sourceGroup);
    await sourceState.saveToStorage();

    // Load and clone
    const loadedState = TabsState.loadFromStorage("source");
    const clonedState = loadedState.deepClone();

    // Modify the clone extensively
    const clonedGroup = Array.from(clonedState.groups.values())[0];
    const newGroup = createTestGroup("new-group", "New Group", [
      "/new/file.ts",
    ]);
    clonedState.addTabsGroup(newGroup);
    clonedState.setGroupLabel(clonedGroup.id!, "Modified");
    clonedState.removeTabsGroup(clonedGroup.id!);

    // Reload original from storage
    const reloadedSource = TabsState.loadFromStorage("source");
    assert.strictEqual(
      reloadedSource.groups.size,
      1,
      "Source should still have 1 group",
    );
    const reloadedGroup = Array.from(reloadedSource.groups.values())[0];
    assert.strictEqual(
      reloadedGroup.getLabel(),
      "Source",
      "Source label unchanged",
    );
    assert.strictEqual(
      reloadedGroup.isPinned(),
      true,
      "Source pin status unchanged",
    );
  });

  test("Branch state should handle empty groups correctly", async () => {
    const emptyState = new TabsState("empty");
    await emptyState.saveToStorage();

    const loadedEmpty = TabsState.loadFromStorage("empty");
    assert.strictEqual(
      loadedEmpty.groups.size,
      0,
      "Empty state should have no groups",
    );
    assert.strictEqual(
      loadedEmpty.branchName,
      "empty",
      "Branch name should be preserved",
    );
  });

  test("Multiple sequential branch switches should preserve all branches", async () => {
    // Create multiple branch states
    const branches = ["branch1", "branch2", "branch3"];

    for (let i = 0; i < branches.length; i++) {
      const state = new TabsState(branches[i]);
      const group = createTestGroup(`group-${i}`, `Group ${i + 1}`, [
        `/branch${i + 1}/file.ts`,
      ]);
      state.addTabsGroup(group);
      await state.saveToStorage();
    }

    // Verify all branches can be loaded correctly
    for (let i = 0; i < branches.length; i++) {
      const loaded = TabsState.loadFromStorage(branches[i]);
      assert.strictEqual(
        loaded.groups.size,
        1,
        `Branch ${i + 1} should have 1 group`,
      );
      const group = Array.from(loaded.groups.values())[0];
      assert.strictEqual(
        group.getLabel(),
        `Group ${i + 1}`,
        `Branch ${i + 1} label correct`,
      );
    }
  });

  test("Tab order should be preserved after branch switch", async () => {
    const state = new TabsState("ordered");
    const group = createTestGroup("ordered-group", "Ordered", [
      "/first.ts",
      "/second.ts",
      "/third.ts",
      "/fourth.ts",
    ]);
    state.addTabsGroup(group);
    await state.saveToStorage();

    const loaded = TabsState.loadFromStorage("ordered");
    const loadedGroup = Array.from(loaded.groups.values())[0];
    const tabs = loadedGroup.getTabs();

    assert.strictEqual(tabs.length, 4, "Should have 4 tabs");
    assert.ok(tabs[0].fileUri.fsPath.endsWith("first.ts"), "First tab correct");
    assert.ok(
      tabs[1].fileUri.fsPath.endsWith("second.ts"),
      "Second tab correct",
    );
    assert.ok(tabs[2].fileUri.fsPath.endsWith("third.ts"), "Third tab correct");
    assert.ok(
      tabs[3].fileUri.fsPath.endsWith("fourth.ts"),
      "Fourth tab correct",
    );
  });

  test("Complex state with multiple pinned and tagged groups should be preserved", async () => {
    const complexState = new TabsState("complex");

    const pinnedGroup = createTestGroup("pinned", "Pinned", [
      "/p1.ts",
      "/p2.ts",
    ]);
    pinnedGroup.setPin(true);

    const taggedGroup = createTestGroup("tagged", "Tagged", ["/t1.ts"]);
    taggedGroup.setTags(["tag1", "tag2", "tag3"]);

    const pinnedTaggedGroup = createTestGroup("both", "Both", [
      "/b1.ts",
      "/b2.ts",
      "/b3.ts",
    ]);
    pinnedTaggedGroup.setPin(true);
    pinnedTaggedGroup.setTags(["important"]);

    const regularGroup = createTestGroup("regular", "Regular", ["/r1.ts"]);

    complexState.addTabsGroup(pinnedGroup);
    complexState.addTabsGroup(taggedGroup);
    complexState.addTabsGroup(pinnedTaggedGroup);
    complexState.addTabsGroup(regularGroup);

    await complexState.saveToStorage();

    const loaded = TabsState.loadFromStorage("complex");
    assert.strictEqual(loaded.groups.size, 4, "Should have 4 groups");

    const groups = Array.from(loaded.groups.values());
    const pinnedLoaded = groups.find((g) => g.getLabel() === "Pinned")!;
    const taggedLoaded = groups.find((g) => g.getLabel() === "Tagged")!;
    const bothLoaded = groups.find((g) => g.getLabel() === "Both")!;
    const regularLoaded = groups.find((g) => g.getLabel() === "Regular")!;

    assert.ok(pinnedLoaded, "Pinned group should exist");
    assert.ok(taggedLoaded, "Tagged group should exist");
    assert.ok(bothLoaded, "Both group should exist");
    assert.ok(regularLoaded, "Regular group should exist");

    assert.strictEqual(
      pinnedLoaded.isPinned(),
      true,
      "Pinned status preserved",
    );
    assert.strictEqual(
      pinnedLoaded.getTabs().length,
      2,
      "Pinned tabs count correct",
    );

    assert.deepStrictEqual(
      taggedLoaded.getTags(),
      ["tag1", "tag2", "tag3"],
      "Tags preserved",
    );

    assert.strictEqual(
      bothLoaded.isPinned(),
      true,
      "Both pinned status preserved",
    );
    assert.deepStrictEqual(
      bothLoaded.getTags(),
      ["important"],
      "Both tags preserved",
    );
    assert.strictEqual(
      bothLoaded.getTabs().length,
      3,
      "Both tabs count correct",
    );

    assert.strictEqual(regularLoaded.isPinned(), false, "Regular not pinned");
    assert.strictEqual(
      regularLoaded.getTags().length,
      0,
      "Regular has no tags",
    );
  });
});
