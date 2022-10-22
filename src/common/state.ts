// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "./global";

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
  public static update(key: string, value: any): Thenable<void> {
    return Global.context.globalState.update(key, value);
  }

  public static get<T>(key: string, defaultValue: T): T {
    return Global.context.globalState.get(key, defaultValue);
  }

  public static getOrUndefined<T>(key: string): T | undefined {
    return Global.context.globalState.get(key);
  }
}
