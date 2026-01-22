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

suite("Integration Workflow Test Suite", () => {
  suiteSetup(() => {
    setupTestGlobals();
  });

  setup(() => {
    resetTestState();
  });

  /**
   * Simulates a multi-level directory structure with various file types
   */
  function createProjectStructure(): Map<string, string> {
    return new Map([
      // src directory
      ["/project/src/main.ts", "main.ts"],
      ["/project/src/app.ts", "app.ts"],
      ["/project/src/utils/helpers.ts", "helpers.ts"],
      ["/project/src/utils/logger.ts", "logger.ts"],
      ["/project/src/components/Button.tsx", "Button.tsx"],
      ["/project/src/components/Modal.tsx", "Modal.tsx"],
      ["/project/src/services/api.ts", "api.ts"],
      ["/project/src/services/auth.ts", "auth.ts"],

      // test directory
      ["/project/tests/main.test.ts", "main.test.ts"],
      ["/project/tests/utils.test.ts", "utils.test.ts"],
      ["/project/tests/components/Button.test.tsx", "Button.test.tsx"],

      // config files
      ["/project/package.json", "package.json"],
      ["/project/tsconfig.json", "tsconfig.json"],
      ["/project/README.md", "README.md"],

      // docs
      ["/project/docs/api.md", "api.md"],
      ["/project/docs/setup.md", "setup.md"],
    ]);
  }

  function createTabsFromFiles(files: Map<string, string>): TabItem[] {
    const tabs: TabItem[] = [];
    let idx = 0;
    for (const [path, label] of files) {
      const tab = new TabItem(vscode.Uri.file(path), `tab-${idx}`, label);
      tabs.push(tab);
      idx++;
    }
    return tabs;
  }

  test("should organize tabs by directory structure", () => {
    const state = new TabsState();
    const files = createProjectStructure();
    const tabs = createTabsFromFiles(files);

    // Organize by top-level directories
    const srcGroup = new TabsGroup("src-group", "Source Files");
    const testGroup = new TabsGroup("test-group", "Test Files");
    const configGroup = new TabsGroup("config-group", "Config Files");
    const docsGroup = new TabsGroup("docs-group", "Documentation");

    for (const tab of tabs) {
      const path = tab.fileUri.fsPath;
      if (path.includes("/src/")) {
        srcGroup.pushTab(tab);
      } else if (path.includes("/tests/")) {
        testGroup.pushTab(tab);
      } else if (path.includes("/docs/")) {
        docsGroup.pushTab(tab);
      } else if (path.endsWith(".json") || path.endsWith(".md")) {
        configGroup.pushTab(tab);
      }
    }

    state.addTabsGroup(srcGroup);
    state.addTabsGroup(testGroup);
    state.addTabsGroup(configGroup);
    state.addTabsGroup(docsGroup);

    assert.strictEqual(state.groups.size, 4);
    assert.strictEqual(srcGroup.getTabs().length, 8);
    assert.strictEqual(testGroup.getTabs().length, 3);
    assert.strictEqual(configGroup.getTabs().length, 3); // package.json, tsconfig.json, README.md
    assert.strictEqual(docsGroup.getTabs().length, 2);
  });

  test("should organize tabs by file extension", () => {
    const state = new TabsState();
    const files = createProjectStructure();
    const tabs = createTabsFromFiles(files);

    // Organize by extension
    const tsGroup = new TabsGroup("ts-group", "TypeScript Files");
    const tsxGroup = new TabsGroup("tsx-group", "React Components");
    const jsonGroup = new TabsGroup("json-group", "JSON Files");
    const mdGroup = new TabsGroup("md-group", "Markdown Files");

    for (const tab of tabs) {
      const path = tab.fileUri.fsPath;
      if (path.endsWith(".tsx")) {
        tsxGroup.pushTab(tab);
      } else if (path.endsWith(".ts")) {
        tsGroup.pushTab(tab);
      } else if (path.endsWith(".json")) {
        jsonGroup.pushTab(tab);
      } else if (path.endsWith(".md")) {
        mdGroup.pushTab(tab);
      }
    }

    state.addTabsGroup(tsGroup);
    state.addTabsGroup(tsxGroup);
    state.addTabsGroup(jsonGroup);
    state.addTabsGroup(mdGroup);

    assert.strictEqual(state.groups.size, 4);
    // Fix: Count actual .ts files (not .tsx): 8 files
    assert.strictEqual(tsGroup.getTabs().length, 8);
    assert.strictEqual(tsxGroup.getTabs().length, 3);
    assert.strictEqual(jsonGroup.getTabs().length, 2);
    assert.strictEqual(mdGroup.getTabs().length, 3);
  });

  test("should handle complete workflow: create, modify, pin, merge groups", () => {
    const state = new TabsState();

    // Step 1: Create initial groups
    const group1 = new TabsGroup("group-1", "Feature A");
    const tab1 = new TabItem(
      vscode.Uri.file("/project/src/featureA/index.ts"),
      "tab-1",
      "index.ts",
    );
    const tab2 = new TabItem(
      vscode.Uri.file("/project/src/featureA/utils.ts"),
      "tab-2",
      "utils.ts",
    );
    group1.setTabs([tab1, tab2]);

    const group2 = new TabsGroup("group-2", "Feature B");
    const tab3 = new TabItem(
      vscode.Uri.file("/project/src/featureB/main.ts"),
      "tab-3",
      "main.ts",
    );
    group2.setTabs([tab3]);

    state.addTabsGroup(group1);
    state.addTabsGroup(group2);

    assert.strictEqual(state.groups.size, 2);

    // Step 2: Rename group
    state.setGroupLabel("group-1", "Feature A - Completed");
    assert.strictEqual(
      state.getGroup("group-1")?.getLabel(),
      "Feature A - Completed",
    );

    // Step 3: Add tags
    state.setGroupTags("group-1", ["completed", "reviewed"]);
    assert.deepStrictEqual(state.getGroup("group-1")?.getTags(), [
      "completed",
      "reviewed",
    ]);

    // Step 4: Pin group
    state.setPinned("group-1", true);
    assert.strictEqual(state.getGroup("group-1")?.isPinned(), true);

    // Step 5: Add more tabs
    const tab4 = new TabItem(
      vscode.Uri.file("/project/src/featureA/test.ts"),
      "tab-4",
      "test.ts",
    );
    state.addTabsToGroup("group-1", [tab4]);
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 3);

    // Step 6: Merge groups
    state.mergeTabsGroup("group-1", ["group-2"]);
    assert.strictEqual(state.groups.size, 1); // group-2 removed
    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 4);

    // Step 7: Verify pinned group wasn't removed during merge
    assert.strictEqual(state.getGroup("group-1")?.isPinned(), true);
  });

  test("should handle branch archiving workflow", () => {
    // Create main state
    const mainState = new TabsState(null);
    const mainGroup = new TabsGroup("main-group", "Main Work");
    const mainTab = new TabItem(
      vscode.Uri.file("/project/src/main.ts"),
      "main-tab",
      "main.ts",
    );
    mainGroup.setTabs([mainTab]);
    mainState.addTabsGroup(mainGroup);

    // Clone for archiving to a branch
    const branchState = mainState.deepClone();
    branchState.branchName = "feature-x";

    assert.strictEqual(branchState.branchName, "feature-x");
    assert.strictEqual(branchState.groups.size, 1);

    // Verify main state is independent
    mainState.setGroupLabel("main-group", "Modified Main");
    assert.notStrictEqual(
      Array.from(branchState.groups.values())[0].getLabel(),
      "Modified Main",
    );
  });

  test("should handle removing tabs that exist in multiple groups", () => {
    const state = new TabsState();

    // Create overlapping groups (same file in multiple groups)
    const commonFilePath = "/project/shared/common.ts";

    const group1 = new TabsGroup("group-1", "Group 1");
    const tab1 = new TabItem(
      vscode.Uri.file(commonFilePath),
      "tab-1",
      "common.ts",
    );
    const tab2 = new TabItem(
      vscode.Uri.file("/project/src/other1.ts"),
      "tab-2",
      "other1.ts",
    );
    group1.setTabs([tab1, tab2]);

    const group2 = new TabsGroup("group-2", "Group 2");
    const tab3 = new TabItem(
      vscode.Uri.file(commonFilePath),
      "tab-3",
      "common.ts",
    );
    const tab4 = new TabItem(
      vscode.Uri.file("/project/src/other2.ts"),
      "tab-4",
      "other2.ts",
    );
    group2.setTabs([tab3, tab4]);

    state.addTabsGroup(group1);
    state.addTabsGroup(group2);

    // Remove the common file from all groups
    state.removeTabFromAllGroups(commonFilePath);

    assert.strictEqual(state.getGroup("group-1")?.getTabs().length, 1);
    assert.strictEqual(state.getGroup("group-2")?.getTabs().length, 1);

    // Verify the common file is gone
    const hasCommonFile = (group: TabsGroup | undefined) =>
      group?.getTabs().some((t) => t.fileUri.fsPath === commonFilePath);

    assert.strictEqual(hasCommonFile(state.getGroup("group-1")), false);
    assert.strictEqual(hasCommonFile(state.getGroup("group-2")), false);
  });

  test("should properly sort groups by priority", () => {
    const state = new TabsState();

    const now = Date.now();

    // 1. Untitled, unpinned, no tags (lowest priority) - use constant
    const group1 = new TabsGroup("group-1", DEFAULT_TAB_GROUP_LABEL + " 1");
    group1.createTime = now - 1000;
    const tab1 = new TabItem(vscode.Uri.file("/file1.ts"), "tab-1", "file1.ts");
    group1.setTabs([tab1]);

    // 2. Named, unpinned, no tags
    const group2 = new TabsGroup("group-2", "My Custom Group");
    group2.createTime = now - 2000;
    const tab2 = new TabItem(vscode.Uri.file("/file2.ts"), "tab-2", "file2.ts");
    group2.setTabs([tab2]);

    // 3. Named, unpinned, with tags
    const group3 = new TabsGroup("group-3", "Tagged Group");
    group3.setTags(["important"]);
    group3.createTime = now - 3000;
    const tab3 = new TabItem(vscode.Uri.file("/file3.ts"), "tab-3", "file3.ts");
    group3.setTabs([tab3]);

    // 4. Pinned, named, with tags (highest priority)
    const group4 = new TabsGroup("group-4", "Pinned Tagged Group");
    group4.setPin(true);
    group4.setTags(["critical"]);
    group4.createTime = now - 4000;
    const tab4 = new TabItem(vscode.Uri.file("/file4.ts"), "tab-4", "file4.ts");
    group4.setTabs([tab4]);

    // Add in random order
    state.addTabsGroup(group1);
    state.addTabsGroup(group3);
    state.addTabsGroup(group4);
    state.addTabsGroup(group2);

    const sorted = state.getAllTabsGroupsSorted();

    // Verify order: pinned+named+tagged > named+tagged > named > untitled
    assert.strictEqual(sorted[0].id, "group-4"); // Pinned (100) + Named (10) + Tagged (1) = 111
    assert.strictEqual(sorted[1].id, "group-3"); // Named (10) + Tagged (1) = 11
    assert.strictEqual(sorted[2].id, "group-2"); // Named (10) = 10
    assert.strictEqual(sorted[3].id, "group-1"); // Untitled (0) = 0
  });

  test("should handle deep nested directory structure", () => {
    const state = new TabsState();

    // Create a deep nested structure
    const deepFiles = [
      "/project/src/modules/auth/handlers/login/index.ts",
      "/project/src/modules/auth/handlers/login/validation.ts",
      "/project/src/modules/auth/handlers/logout/index.ts",
      "/project/src/modules/auth/services/token.ts",
      "/project/src/modules/auth/models/user.ts",
      "/project/src/modules/dashboard/components/Chart.tsx",
      "/project/src/modules/dashboard/components/Table.tsx",
      "/project/src/modules/dashboard/hooks/useData.ts",
    ];

    const tabs = deepFiles.map((path, idx) => {
      const label = path.split("/").pop() || "";
      return new TabItem(vscode.Uri.file(path), `tab-${idx}`, label);
    });

    // Group by module
    const authGroup = new TabsGroup("auth-group", "Auth Module");
    const dashboardGroup = new TabsGroup("dashboard-group", "Dashboard Module");

    for (const tab of tabs) {
      if (tab.fileUri.fsPath.includes("/auth/")) {
        authGroup.pushTab(tab);
      } else if (tab.fileUri.fsPath.includes("/dashboard/")) {
        dashboardGroup.pushTab(tab);
      }
    }

    state.addTabsGroup(authGroup);
    state.addTabsGroup(dashboardGroup);

    assert.strictEqual(authGroup.getTabs().length, 5);
    assert.strictEqual(dashboardGroup.getTabs().length, 3);

    // Verify all tabs have correct parent
    for (const tab of authGroup.getTabs()) {
      assert.strictEqual(tab.parentId, "auth-group");
    }
    for (const tab of dashboardGroup.getTabs()) {
      assert.strictEqual(tab.parentId, "dashboard-group");
    }
  });
});
