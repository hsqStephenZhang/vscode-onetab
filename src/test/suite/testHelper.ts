// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../../global";

let groupCounter = 0;

/**
 * Mock the Global object for unit tests that don't require full extension activation
 */
export function setupTestGlobals(): void {
  // Mock context with extensionUri
  if (!Global.context) {
    Global.context = {
      extensionUri: vscode.Uri.file("/mock/extension/path"),
      globalStorageUri: vscode.Uri.file("/mock/storage/path"),
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;
  }

  // Mock sqlDb for WorkState.get/set
  if (!Global.sqlDb) {
    const mockKvStore = new Map<string, string>();
    Global.sqlDb = {
      getWorkspaceState: (key: string) => mockKvStore.get(key),
      setWorkspaceState: (key: string, value: string) => {
        mockKvStore.set(key, value);
        return Promise.resolve();
      },
      deleteWorkspaceState: (key: string) => {
        mockKvStore.delete(key);
        return Promise.resolve();
      },
      listWorkspaceKeys: () => Array.from(mockKvStore.keys()),
      // Add other methods as needed for tests
      init: () => Promise.resolve(),
      close: () => Promise.resolve(),
      flush: () => Promise.resolve(),
      getTabsGroups: () => [],
      insertTabsGroup: () => {},
      updateTabsGroup: () => {},
      deleteTabsGroup: () => {},
      getTabsGroupById: () => undefined,
      clearTabsGroups: () => {},
      getTabItems: () => [],
      insertTabItem: () => {},
      deleteTabItem: () => {},
      deleteTabItemsByGroupId: () => {},
      deleteTabItemByPath: () => {},
      getTabItemsByPath: () => [],
      listBranches: () => [],
      deleteBranch: () => {},
    } as any;
  }
}

/**
 * Reset test state between tests
 */
export function resetTestState(): void {
  groupCounter = 0;
  if (Global.sqlDb) {
    const mockKvStore = new Map<string, string>();
    (Global.sqlDb as any).getWorkspaceState = (key: string) => mockKvStore.get(key);
    (Global.sqlDb as any).setWorkspaceState = (key: string, value: string) => {
      mockKvStore.set(key, value);
      return Promise.resolve();
    };
  }
}