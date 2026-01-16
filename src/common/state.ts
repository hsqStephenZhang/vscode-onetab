// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../global";

export class GlobalState {
  public static update(key: string, value: any): Thenable<void> {
    return Global.context.globalState.update(key, value);
  }

  public static get<T>(key: string, defaultValue: T): T | undefined {
    return Global.context.globalState.get(key, defaultValue);
  }

  public static keys(): readonly string[] {
    return Global.context.globalState.keys();
  }
}

export class WorkState {
  private static storage() {
    if (!Global.storage) throw new Error("Storage not initialized");
    return Global.storage;
  }

  public static update(key: string, value: any): Thenable<void> {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return this.storage().setWorkspaceState(key, s);
  }

  public static get<T>(key: string, defaultValue: T): T {
    const s = this.storage().getWorkspaceState(key);
    if (s === undefined) return defaultValue;

    // preserve old behavior: callers often pass string defaultValue for JSON
    if (typeof defaultValue === "string") return s as any;

    try {
      return JSON.parse(s) as T;
    } catch {
      return defaultValue;
    }
  }

  public static getOrUndefined<T>(key: string): T | undefined {
    const s = this.storage().getWorkspaceState(key);
    if (s === undefined) return undefined;
    try {
      return JSON.parse(s) as T;
    } catch {
      return s as any;
    }
  }

  public static delete(key: string): Thenable<void> {
    return this.storage().deleteWorkspaceState(key);
  }

  public static keys(): readonly string[] {
    return this.storage().listWorkspaceKeys();
  }
}
