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
  private static db() {
    if (!Global.sqlDb) throw new Error("sql.js DB not initialized");
    return Global.sqlDb;
  }

  public static update(key: string, value: any): Thenable<void> {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return this.db().setWorkspaceState(key, s) as unknown as Thenable<void>;
  }

  public static get<T>(key: string, defaultValue: T): T {
    const s = this.db().getWorkspaceState(key);
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
    const s = this.db().getWorkspaceState(key);
    if (s === undefined) return undefined;
    try {
      return JSON.parse(s) as T;
    } catch {
      return s as any;
    }
  }

  public static delete(key: string): Thenable<void> {
    return this.db().deleteWorkspaceState(key) as unknown as Thenable<void>;
  }

  public static keys(): readonly string[] {
    return this.db().listWorkspaceKeys();
  }
}
