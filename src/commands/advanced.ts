// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import {
  notInBlackList,
  getAllTabsWithBlackList,
  getLeftTabs,
  getOtherTabsWithBlacklist,
  getRightTabs,
  getActiveTab,
  sendTabs,
  tabIsTextInput,
} from "../utils/tab";
import { TabInputText } from "vscode";
import { TabsGroup } from "../model/tabsgroup";
import { blacklistService } from "../utils/blacklistService";

export async function getNamedGroup(): Promise<TabsGroup | undefined | null> {
  const state = Global.tabsProvider.getState();
  let groups = state.getTitledLists();
  if (groups.length === 0) {
    return null;
  }

  let items: vscode.QuickPickItem[] = groups.map((group) => {
    return {
      label: group.getLabel(),
      description: group
        .getTabs()
        .map((tab) => tab.label)
        .join(","),
    };
  });

  let choice = await vscode.window.showQuickPick(items, {
    matchOnDescription: true,
  });

  if (choice) {
    let r = choice;
    let index = items.findIndex((item) => item.label === r.label);
    if (index >= 0 && index < groups.length) {
      return groups[index];
    }
  }
  return undefined;
}

// NOTE: Blacklist logic works but may have edge cases with symbolic links or case-sensitive paths
export async function advancedSendThisTab(uri: vscode.Uri) {
  let tab = getActiveTab(uri);
  let isValidTab = tab && tabIsTextInput(tab) && notInBlackList(tab);
  if (!isValidTab) {
    vscode.window.showWarningMessage("No selected tab");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    await sendTabs([tab!], group.id);
  }
}

export async function advancedSendOtherTabs(uri: vscode.Uri) {
  let otherTabs = getOtherTabsWithBlacklist(uri);
  if (!otherTabs) {
    vscode.window.showWarningMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    await sendTabs(otherTabs, group.id);
  }
}

export async function advancedSendLeftTabs(uri: vscode.Uri) {
  let leftTabs = getLeftTabs(uri);
  if (!leftTabs) {
    vscode.window.showInformationMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    await sendTabs(leftTabs, group.id);
  }
}

export async function advancedSendRightTabs(uri: vscode.Uri) {
  let rightTabs = getRightTabs(uri);
  if (!rightTabs) {
    vscode.window.showInformationMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    await sendTabs(rightTabs, group.id);
  }
}

export async function advancedSendAllTabs() {
  let allTabs = getAllTabsWithBlackList();
  if (!allTabs) {
    vscode.window.showInformationMessage("No tabs to be saved");
    return;
  }
  let group = await getNamedGroup();
  if (group === null) {
    vscode.window.showInformationMessage("No named group");
  } else if (group === undefined) {
    vscode.window.showInformationMessage("No chosen group");
  } else {
    await sendTabs(allTabs, group.id);
  }
}

export async function sendToBlackList(uri: vscode.Uri) {
  // Determine if the URI is a file or directory
  let stat;
  try {
    stat = await vscode.workspace.fs.stat(uri);
  } catch (error) {
    vscode.window.showErrorMessage("Unable to access the file or directory");
    return;
  }

  const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;

  // Show quick pick for rule type selection
  const ruleTypes = [
    {
      label: "File Pattern",
      description: isDirectory
        ? "Match this directory and all its contents"
        : "Match this specific file",
      value: "file",
    },
    {
      label: "Regular Expression",
      description: "Use a custom regex pattern",
      value: "regex",
    },
  ];

  const selected = await vscode.window.showQuickPick(ruleTypes, {
    placeHolder: "Select blacklist rule type",
  });

  if (!selected) {
    return; // User cancelled
  }

  let rule: string;

  if (selected.value === "file") {
    // Format the pattern: use "dir/**" for directories, plain path for files
    const pattern = isDirectory
      ? uri.path.replace(/\/$/, "") + "/**"
      : uri.path;
    rule = `file:${pattern}`;
  } else {
    // Prompt user for regex pattern
    const defaultPattern = isDirectory
      ? `^${uri.path.replace(/\/$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`
      : `^${uri.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;

    const userPattern = await vscode.window.showInputBox({
      prompt: "Enter regex pattern for blacklist",
      value: defaultPattern,
      placeHolder: "e.g., ^/path/to/.*\\.log$",
    });

    if (!userPattern) {
      return; // User cancelled
    }

    rule = `regex:${userPattern}`;
  }

  // Check if rule already exists
  const existingRules = vscode.workspace
    .getConfiguration()
    .get("onetab.blacklist") as Array<string>;

  if (existingRules && existingRules.includes(rule)) {
    vscode.window.showWarningMessage(`Rule already exists in the blacklist`);
    return;
  }

  // Add the rule using the blacklist service
  await blacklistService.addRule(rule);

  vscode.window.showInformationMessage(`Added to blacklist: ${rule}`);

  Global.logger.debug(`Blacklist rule added: ${rule}`);
}
