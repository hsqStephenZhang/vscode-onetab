// filepath: /Users/zc/codespace/js/vscode-onetab/src/test/suite/utils/git.test.ts
// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { Global } from "../../../global";
import { DEFAULT_BRANCH_NAME } from "../../../constant";
import { setupTestGlobals, resetTestState } from "../testHelper";
import { TabsState } from "../../../model/tabstate";
import { TabsGroup } from "../../../model/tabsgroup";
import { TabItem } from "../../../model/tabitem";

suite("Git Utilities Test Suite", () => {
  suiteSetup(() => {
    setupTestGlobals();
  });

  setup(() => {
    resetTestState();
  });

  test("DEFAULT_BRANCH_NAME should be 'none'", () => {
    assert.strictEqual(DEFAULT_BRANCH_NAME, "none");
  });

  test("Global.branchName should be settable", () => {
    Global.branchName = "feature-branch";
    assert.strictEqual(Global.branchName, "feature-branch");

    Global.branchName = DEFAULT_BRANCH_NAME;
    assert.strictEqual(Global.branchName, DEFAULT_BRANCH_NAME);
  });

  test("Branch name should persist across operations", () => {
    const testBranch = "test-feature-branch";
    Global.branchName = testBranch;

    // Simulate some operations
    const state = new TabsState(testBranch);

    assert.strictEqual(Global.branchName, testBranch);
    assert.strictEqual(state.branchName, testBranch);
  });
});
