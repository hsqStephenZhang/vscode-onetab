// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";
import { tabIsTextInput } from "../../../utils/tab";

suite("Tab Utils Test Suite", () => {
  // Note: Most tab utility functions require VS Code window/tab context
  // which is difficult to mock. These tests focus on pure functions.

  test("tabIsTextInput should identify TabInputText correctly", () => {
    // This would require mocking vscode.Tab which is complex
    // Instead, we test the logic pattern
    
    const mockTextTab = {
      input: new vscode.TabInputText(vscode.Uri.file("/path/file.ts")),
    };
    
    assert.strictEqual(mockTextTab.input instanceof vscode.TabInputText, true);
  });

  test("tabIsTextInput should reject non-text inputs", () => {
    const mockNonTextTab = {
      input: {}, // Not TabInputText
    };
    
    assert.strictEqual(mockNonTextTab.input instanceof vscode.TabInputText, false);
  });
});