// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../../global";
import { StorageService } from "../../db/storageService";

let groupCounter = 0;

/**
 * Mock StorageService for unit tests that don't require full extension activation
 */
class MockStorageService extends StorageService {
  private mockStore: Map<string, string> = new Map();

  constructor() {
    super({} as vscode.Memento);
  }

  override getWorkspaceState(key: string): string | undefined {
    return this.mockStore.get(key);
  }

  override setWorkspaceState(key: string, value: string): Thenable<void> {
    this.mockStore.set(key, value);
    return Promise.resolve();
  }

  override deleteWorkspaceState(key: string): Thenable<void> {
    this.mockStore.delete(key);
    return Promise.resolve();
  }

  override listWorkspaceKeys(): string[] {
    return Array.from(this.mockStore.keys());
  }
}

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

  // Mock storage service
  if (!Global.storage) {
    Global.storage = new MockStorageService();
  }

  // Mock logger (optional, for safety)
  if (!Global.logger) {
    Global.logger = {
      debug: (msg: string) => console.debug(msg),
      info: (msg: string) => console.info(msg),
      warn: (msg: string) => console.warn(msg),
      error: (msg: string) => console.error(msg),
    } as any;
  }
}

/**
 * Reset test state between tests
 */
export function resetTestState(): void {
  groupCounter = 0;

  // Clear and reset the storage service
  if (Global.storage) {
    const mockService = Global.storage as MockStorageService;
    // Clear all keys
    const keys = mockService.listWorkspaceKeys();
    for (const key of keys) {
      mockService.deleteWorkspaceState(key);
    }
  }
}