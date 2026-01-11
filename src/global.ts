// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Logger } from "./logging";
import { TabsProvider } from "./providers/activeGroupsProvider";
import { BranchesProvider } from "./providers/nonActiveBranchesProvider";
import { TagsProvider } from "./providers/tagsProvider"; // Add this import
import { WorkState } from "./common/state";
import { SqlJsDatabaseService } from "./db";

// global is a singleton, can be used after initialization at the beginning of the extension
export class Global {
  public static context: vscode.ExtensionContext;
  public static branchName: string;
  public static tabsProvider: TabsProvider;
  public static branchesProvider: BranchesProvider;
  public static tagsProvider: TagsProvider; // Add this
  public static outputChannel: vscode.OutputChannel;
  public static logger: Logger;
  public static sqlDb: SqlJsDatabaseService;

  public static getAndIncGroupCnt(): number {
    let cnt = WorkState.get<number>("groupCnt", 0);
    cnt += 1;
    WorkState.update("groupCnt", cnt);
    return cnt;
  }
}
