import * as assert from "assert";
import * as vscode from "vscode";
import { TabsState } from "../../../model/tabstate";
import { TabsGroup } from "../../../model/tabsgroup";
import { TabItem } from "../../../model/tabitem";
import { setupTestGlobals, resetTestState } from "../testHelper";

suite("Persistence Integration Test Suite", () => {
    suiteSetup(() => {
        setupTestGlobals();
    });

    setup(() => {
        resetTestState();
    });

    test("should persist and load a simple group with tabs", async () => {
        // Step 1: Create and save state
        const state1 = new TabsState(null);
        const group = new TabsGroup("group-1", "Test Group");
        const tab1 = new TabItem(vscode.Uri.file("/project/file1.ts"), "tab-1", "file1.ts");
        const tab2 = new TabItem(vscode.Uri.file("/project/file2.ts"), "tab-2", "file2.ts");
        group.setTabs([tab1, tab2]);

        state1.addTabsGroup(group);

        // Persist to storage
        await state1.persistChanges();

        // Step 2: Load from storage
        const state2 = TabsState.loadFromStorage(null);

        // Step 3: Verify loaded state matches original
        assert.strictEqual(state2.groups.size, 1);
        const loadedGroup = state2.getGroup("group-1");
        assert.ok(loadedGroup, "Group should exist");
        assert.strictEqual(loadedGroup!.getLabel(), "Test Group");
        assert.strictEqual(loadedGroup!.getTabs().length, 2);

        const loadedTabs = loadedGroup!.getTabs();
        assert.strictEqual(loadedTabs[0].fileUri.fsPath, "/project/file1.ts");
        assert.strictEqual(loadedTabs[1].fileUri.fsPath, "/project/file2.ts");
    });

    test("should persist and load group with tags and pinned status", async () => {
        // Step 1: Create and save state
        const state1 = new TabsState(null);
        const group = new TabsGroup("group-1", "Tagged Group");
        group.setPin(true);
        group.setTags(["important", "reviewed"]);

        const tab = new TabItem(vscode.Uri.file("/project/file.ts"), "tab-1", "file.ts");
        group.setTabs([tab]);

        state1.addTabsGroup(group);
        await state1.persistChanges();

        // Step 2: Load from storage
        const state2 = TabsState.loadFromStorage(null);

        // Step 3: Verify all attributes persisted
        const loadedGroup = state2.getGroup("group-1");
        assert.ok(loadedGroup);
        assert.strictEqual(loadedGroup!.isPinned(), true);
        assert.deepStrictEqual(loadedGroup!.getTags(), ["important", "reviewed"]);
    });

    test("should persist and load multiple groups", async () => {
        // Step 1: Create and save multiple groups
        const state1 = new TabsState(null);

        const group1 = new TabsGroup("group-1", "Frontend");
        group1.setPin(true);
        const tab1 = new TabItem(vscode.Uri.file("/src/App.tsx"), "tab-1", "App.tsx");
        const tab2 = new TabItem(vscode.Uri.file("/src/index.ts"), "tab-2", "index.ts");
        group1.setTabs([tab1, tab2]);

        const group2 = new TabsGroup("group-2", "Backend");
        group2.setTags(["api"]);
        const tab3 = new TabItem(vscode.Uri.file("/api/routes.ts"), "tab-3", "routes.ts");
        const tab4 = new TabItem(vscode.Uri.file("/api/handlers.ts"), "tab-4", "handlers.ts");
        group2.setTabs([tab3, tab4]);

        const group3 = new TabsGroup("group-3", "Config");
        const tab5 = new TabItem(vscode.Uri.file("/config.json"), "tab-5", "config.json");
        group3.setTabs([tab5]);

        state1.addTabsGroup(group1);
        state1.addTabsGroup(group2);
        state1.addTabsGroup(group3);

        await state1.persistChanges();

        // Step 2: Load from storage
        const state2 = TabsState.loadFromStorage(null);

        // Step 3: Verify all groups loaded
        assert.strictEqual(state2.groups.size, 3);

        const loaded1 = state2.getGroup("group-1");
        assert.strictEqual(loaded1!.getLabel(), "Frontend");
        assert.strictEqual(loaded1!.isPinned(), true);
        assert.strictEqual(loaded1!.getTabs().length, 2);

        const loaded2 = state2.getGroup("group-2");
        assert.strictEqual(loaded2!.getLabel(), "Backend");
        assert.deepStrictEqual(loaded2!.getTags(), ["api"]);
        assert.strictEqual(loaded2!.getTabs().length, 2);

        const loaded3 = state2.getGroup("group-3");
        assert.strictEqual(loaded3!.getLabel(), "Config");
        assert.strictEqual(loaded3!.getTabs().length, 1);
    });

    test("should persist and load state with branch name", async () => {
        // Step 1: Create and save branch state
        const state1 = new TabsState("feature-x");
        const group = new TabsGroup("group-1", "Feature Work");
        const tab = new TabItem(vscode.Uri.file("/feature/index.ts"), "tab-1", "index.ts");
        group.setTabs([tab]);

        state1.addTabsGroup(group);
        await state1.persistChanges();

        // Step 2: Load the specific branch
        const state2 = TabsState.loadFromStorage("feature-x");

        // Step 3: Verify branch data loaded
        assert.strictEqual(state2.branchName, "feature-x");
        assert.strictEqual(state2.groups.size, 1);
        assert.ok(state2.getGroup("group-1"));

        // Step 4: Verify different branch is empty
        const state3 = TabsState.loadFromStorage("other-branch");
        assert.strictEqual(state3.groups.size, 0);
    });

    test("should handle modifications and persist selective changes", async () => {
        // Step 1: Create initial state
        const state1 = new TabsState(null);

        const group1 = new TabsGroup("group-1", "Group 1");
        const tab1 = new TabItem(vscode.Uri.file("/file1.ts"), "tab-1", "file1.ts");
        group1.setTabs([tab1]);

        const group2 = new TabsGroup("group-2", "Group 2");
        const tab2 = new TabItem(vscode.Uri.file("/file2.ts"), "tab-2", "file2.ts");
        group2.setTabs([tab2]);

        state1.addTabsGroup(group1);
        state1.addTabsGroup(group2);
        await state1.persistChanges();

        // Step 2: Reload and modify only one group
        const state2 = TabsState.loadFromStorage(null);
        state2.setGroupLabel("group-1", "Modified Group 1");
        await state2.persistChanges();

        // Step 3: Load again and verify changes persisted
        const state3 = TabsState.loadFromStorage(null);
        assert.strictEqual(state3.getGroup("group-1")?.getLabel(), "Modified Group 1");
        assert.strictEqual(state3.getGroup("group-2")?.getLabel(), "Group 2");
    });

    test("should persist after adding tabs to existing group", async () => {
        // Step 1: Create initial state with a group
        const state1 = new TabsState(null);
        const group = new TabsGroup("group-1", "Test Group");
        const tab1 = new TabItem(vscode.Uri.file("/file1.ts"), "tab-1", "file1.ts");
        group.setTabs([tab1]);

        state1.addTabsGroup(group);
        await state1.persistChanges();

        // Step 2: Reload and add tabs
        const state2 = TabsState.loadFromStorage(null);
        const tab2 = new TabItem(vscode.Uri.file("/file2.ts"), "tab-2", "file2.ts");
        const tab3 = new TabItem(vscode.Uri.file("/file3.ts"), "tab-3", "file3.ts");
        state2.addTabsToGroup("group-1", [tab2, tab3]);
        await state2.persistChanges();

        // Step 3: Load again and verify all tabs persisted
        const state3 = TabsState.loadFromStorage(null);
        const loadedGroup = state3.getGroup("group-1");
        assert.strictEqual(loadedGroup!.getTabs().length, 3);
        assert.strictEqual(
            loadedGroup!.getTabs().map(t => t.fileUri.fsPath).join(","),
            "/file1.ts,/file2.ts,/file3.ts"
        );
    });

    test("should persist after removing tabs from group", async () => {
        // Step 1: Create initial state with multiple tabs
        const state1 = new TabsState(null);
        const group = new TabsGroup("group-1", "Test Group");
        const tab1 = new TabItem(vscode.Uri.file("/file1.ts"), "tab-1", "file1.ts");
        const tab2 = new TabItem(vscode.Uri.file("/file2.ts"), "tab-2", "file2.ts");
        const tab3 = new TabItem(vscode.Uri.file("/file3.ts"), "tab-3", "file3.ts");
        group.setTabs([tab1, tab2, tab3]);

        state1.addTabsGroup(group);
        await state1.persistChanges();

        // Step 2: Reload and remove a tab
        const state2 = TabsState.loadFromStorage(null);
        state2.removeTabFromGroup("group-1", "/file2.ts");
        await state2.persistChanges();

        // Step 3: Load again and verify tab was removed
        const state3 = TabsState.loadFromStorage(null);
        const loadedGroup = state3.getGroup("group-1");
        assert.strictEqual(loadedGroup!.getTabs().length, 2);

        const paths = loadedGroup!.getTabs().map(t => t.fileUri.fsPath);
        assert.strictEqual(paths.includes("/file2.ts"), false);
        assert.strictEqual(paths.includes("/file1.ts"), true);
        assert.strictEqual(paths.includes("/file3.ts"), true);
    });

    test("should persist after deleting a group", async () => {
        // Step 1: Create initial state with multiple groups
        const state1 = new TabsState(null);

        const group1 = new TabsGroup("group-1", "Group 1");
        const tab1 = new TabItem(vscode.Uri.file("/file1.ts"), "tab-1", "file1.ts");
        group1.setTabs([tab1]);

        const group2 = new TabsGroup("group-2", "Group 2");
        const tab2 = new TabItem(vscode.Uri.file("/file2.ts"), "tab-2", "file2.ts");
        group2.setTabs([tab2]);

        state1.addTabsGroup(group1);
        state1.addTabsGroup(group2);
        await state1.persistChanges();

        // Step 2: Reload and delete a group
        const state2 = TabsState.loadFromStorage(null);
        state2.removeTabsGroup("group-1");
        await state2.persistChanges();

        // Step 3: Load again and verify group was deleted
        const state3 = TabsState.loadFromStorage(null);
        assert.strictEqual(state3.groups.size, 1);
        assert.ok(!state3.getGroup("group-1"));
        assert.ok(state3.getGroup("group-2"));
    });

    test("should persist complex operations: merge, pin, tag", async () => {
        // Step 1: Create initial state
        const state1 = new TabsState(null);

        const group1 = new TabsGroup("group-1", "Group A");
        const tab1 = new TabItem(vscode.Uri.file("/fileA.ts"), "tab-1", "fileA.ts");
        group1.setTabs([tab1]);

        const group2 = new TabsGroup("group-2", "Group B");
        const tab2 = new TabItem(vscode.Uri.file("/fileB.ts"), "tab-2", "fileB.ts");
        group2.setTabs([tab2]);

        state1.addTabsGroup(group1);
        state1.addTabsGroup(group2);
        await state1.persistChanges();

        // Step 2: Reload and perform complex operations
        const state2 = TabsState.loadFromStorage(null);
        state2.setPinned("group-1", true);
        state2.setGroupTags("group-1", ["critical", "merged"]);
        state2.mergeTabsGroup("group-1", ["group-2"]);
        await state2.persistChanges();

        // Step 3: Load again and verify all changes persisted
        const state3 = TabsState.loadFromStorage(null);
        assert.strictEqual(state3.groups.size, 1);

        const mergedGroup = state3.getGroup("group-1");
        assert.ok(mergedGroup);
        assert.strictEqual(mergedGroup!.isPinned(), true);
        assert.deepStrictEqual(mergedGroup!.getTags(), ["critical", "merged"]);
        assert.strictEqual(mergedGroup!.getTabs().length, 2);
    });

    test("should persist with tab types (diff, notebook)", async () => {
        // Step 1: Create state with various tab types
        const state1 = new TabsState(null);
        const group = new TabsGroup("group-1", "Mixed Types");

        const textTab = new TabItem(vscode.Uri.file("/file.ts"), "tab-1", "file.ts");
        textTab.setTabType("text");

        const diffTab = new TabItem(vscode.Uri.file("/diff.ts"), "tab-2", "diff.ts");
        diffTab.setTabType("diff");
        diffTab.setOriginalUri(vscode.Uri.file("/original.ts"));

        const notebookTab = new TabItem(vscode.Uri.file("/notebook.ipynb"), "tab-3", "notebook.ipynb");
        notebookTab.setTabType("notebook");

        group.setTabs([textTab, diffTab, notebookTab]);
        state1.addTabsGroup(group);
        await state1.persistChanges();

        // Step 2: Load and verify tab types
        const state2 = TabsState.loadFromStorage(null);
        const loadedGroup = state2.getGroup("group-1");
        const loadedTabs = loadedGroup!.getTabs();

        assert.strictEqual(loadedTabs[0].tabType, "text");
        assert.strictEqual(loadedTabs[1].tabType, "diff");
        assert.ok(loadedTabs[1].originalUri);
        assert.strictEqual(loadedTabs[2].tabType, "notebook");
    });

    test("should persist empty state and load correctly", async () => {
        // Step 1: Create empty state and persist
        const state1 = new TabsState(null);
        await state1.persistChanges();

        // Step 2: Load empty state
        const state2 = TabsState.loadFromStorage(null);
        assert.strictEqual(state2.groups.size, 0);
    });

    test("should persist state after clearing all groups", async () => {
        // Step 1: Create state with groups
        const state1 = new TabsState(null);
        const group = new TabsGroup("group-1", "Test");
        const tab = new TabItem(vscode.Uri.file("/file.ts"), "tab-1", "file.ts");
        group.setTabs([tab]);
        state1.addTabsGroup(group);
        await state1.persistChanges();

        // Step 2: Reload and clear
        const state2 = TabsState.loadFromStorage(null);
        assert.strictEqual(state2.groups.size, 1);

        state2.removeTabsGroup("group-1");
        await state2.persistChanges();

        // Step 3: Load again and verify cleared
        const state3 = TabsState.loadFromStorage(null);
        assert.strictEqual(state3.groups.size, 0);
    });

    test("should isolate persistence between different branches", async () => {
        // Step 1: Create state for main branch
        const mainState = new TabsState(null);
        const mainGroup = new TabsGroup("main-group", "Main");
        const mainTab = new TabItem(vscode.Uri.file("/main.ts"), "tab-1", "main.ts");
        mainGroup.setTabs([mainTab]);
        mainState.addTabsGroup(mainGroup);
        await mainState.persistChanges();

        // Step 2: Create state for feature branch
        const featureState = new TabsState("feature-x");
        const featureGroup = new TabsGroup("feature-group", "Feature");
        const featureTab = new TabItem(vscode.Uri.file("/feature.ts"), "tab-1", "feature.ts");
        featureGroup.setTabs([featureTab]);
        featureState.addTabsGroup(featureGroup);
        await featureState.persistChanges();

        // Step 3: Load both and verify isolation
        const loadedMain = TabsState.loadFromStorage(null);
        const loadedFeature = TabsState.loadFromStorage("feature-x");

        assert.strictEqual(loadedMain.groups.size, 1);
        assert.ok(loadedMain.getGroup("main-group"));
        assert.ok(!loadedMain.getGroup("feature-group"));

        assert.strictEqual(loadedFeature.groups.size, 1);
        assert.ok(loadedFeature.getGroup("feature-group"));
        assert.ok(!loadedFeature.getGroup("main-group"));
    });
});