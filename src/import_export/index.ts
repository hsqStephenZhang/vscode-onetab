import * as vscode from "vscode";
import * as fs from "fs";
import { Global } from "../global";
import { TabsState } from "../model/tabstate";
import { OutputChannelLogger } from "../logging";

type TabsStateDTO = {
  groups?: Record<string, any>;
  blackList?: string[];
};

function isTabsStateDTO(value: any): value is TabsStateDTO {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    // must have at least one of the known keys
    ("groups" in value || "blackList" in value)
  );
}

function isBranchesWrapper(value: any): value is { branches: Record<string, TabsStateDTO> } {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.branches &&
    typeof value.branches === "object" &&
    !Array.isArray(value.branches)
  );
}

function looksLikeBranchMap(value: any): value is Record<string, TabsStateDTO> {
  // e.g. { "main": {groups:{...}, blackList:[]}, "dev": {...} }
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  // Heuristic: most values look like TabsStateDTO
  const sampleKeys = keys.slice(0, Math.min(5, keys.length));
  let ok = 0;
  for (const k of sampleKeys) {
    if (isTabsStateDTO((value as any)[k])) ok++;
  }
  return ok >= Math.max(1, Math.floor(sampleKeys.length / 2));
}

async function readJsonFile(uri: vscode.Uri): Promise<any> {
  const buf = await fs.promises.readFile(uri.fsPath);
  const text = buf.toString("utf8");
  return JSON.parse(text);
}

async function confirmReplaceMerge(scopeLabel: string): Promise<"replace" | "merge" | undefined> {
  // Keep it simple: default to Replace (safer + predictable)
  const picked = await vscode.window.showQuickPick(
    [
      { label: "Replace", description: `Replace ${scopeLabel} completely with imported data`, value: "replace" as const },
      { label: "Merge", description: `Merge imported data into ${scopeLabel} (may overwrite matching group IDs)`, value: "merge" as const },
    ],
    { title: `How should Onetab apply the imported data?`, ignoreFocusOut: true }
  );
  return picked?.value;
}

function mergeTabsState(dst: TabsState, src: TabsState): TabsState {
  // Merge strategy:
  // - groups: overwrite by groupId (imported wins)
  // - blackList: union
  const merged = dst.deepClone();

  for (const [gid, group] of src.groups) {
    if (gid) merged.groups.set(gid, group);
  }
  for (const item of src.blackList) {
    merged.blackList.add(item);
  }

  // Ensure internal index is correct: easiest is roundtrip via JSON
  return TabsState.fromJSON(merged.toJSON() as any);
}

export async function exportJsonData() {
  try {
    // =========================================================
    // 1. Export Current Branch State
    // =========================================================

    // Get the raw data object (DTO) using our new toJSON method
    const currentState = Global.tabsProvider.getState();
    const currentDto = currentState.toJSON();

    // Convert to formatted string
    const currentDataStr = JSON.stringify(currentDto, null, 4);

    Global.logger.info("Exporting Current Branch JSON data length: " + currentDataStr.length);

    const uri = await vscode.window.showSaveDialog({
      title: "Export Current Branch State",
      defaultUri: vscode.Uri.file("current-branch-tabs.json"),
      filters: { "JSON files": ["json"] },
    });

    if (uri && uri.fsPath) {
      fs.writeFile(uri.fsPath, currentDataStr, "utf8", (err) => {
        if (err) {
          vscode.window.showErrorMessage("Failed to save file: " + err.message);
        } else {
          vscode.window.showInformationMessage("Current branch state saved successfully!");
        }
      });
    }

    // if there is only one branch, skip exporting all branches
    if (Global.branchesProvider.allBranches().length <= 1) {
      Global.logger.info("Only one branch exists, skipping export of all branches.");
      return;
    }

    // =========================================================
    // 2. Export All Branches' States
    // =========================================================

    // Assuming Global.branchesProvider.getStates() returns a Map<string, TabsState>
    const allStatesMap = Global.branchesProvider.getStates();
    const allStatesObj: Record<string, any> = {};

    // Manually serialize the map
    // We iterate over the map entries and call .toJSON() on each TabsState
    if (allStatesMap instanceof Map) {
      for (const [branchName, state] of allStatesMap) {
        if (state && typeof state.toJSON === 'function') {
          allStatesObj[branchName] = state.toJSON();
        } else {
          // Fallback if state is somehow raw data
          allStatesObj[branchName] = state;
        }
      }
    } else {
      // Fallback if it's already a plain object
      const obj = allStatesMap as any;
      for (const key in obj) {
        if (obj[key] && typeof obj[key].toJSON === 'function') {
          allStatesObj[key] = obj[key].toJSON();
        } else {
          allStatesObj[key] = obj[key];
        }
      }
    }

    const allDataStr = JSON.stringify(allStatesObj, null, 4);
    Global.logger.info("Exporting All Branches JSON data length: " + allDataStr.length);

    const uri2 = await vscode.window.showSaveDialog({
      title: "Export All Branches' States",
      defaultUri: vscode.Uri.file("all-branches-tabs.json"),
      filters: { "JSON files": ["json"] },
    });

    if (uri2 && uri2.fsPath) {
      fs.writeFile(uri2.fsPath, allDataStr, "utf8", (err) => {
        if (err) {
          vscode.window.showErrorMessage("Failed to save file: " + err.message);
        } else {
          vscode.window.showInformationMessage("All branches' states saved successfully!");
        }
      });
    }

  } catch (error: any) {
    Global.logger.error("Error during export: " + error.message);
    vscode.window.showErrorMessage("An error occurred during export.");
  }
}

export async function importJsonData() {
  try {
    const uri = await vscode.window.showOpenDialog({
      title: "Import Onetab JSON",
      canSelectMany: false,
      openLabel: "Import",
      filters: { "JSON files": ["json"] },
    });

    if (!uri || uri.length === 0) return;

    const json = await readJsonFile(uri[0]);

    // Case A: wrapper used by BranchesProvider storage: { branches: { name: TabsStateDTO } }
    if (isBranchesWrapper(json)) {
      const mode = await confirmReplaceMerge("saved branch states");
      if (!mode) return;

      for (const [branchName, dto] of Object.entries(json.branches)) {
        const importedState = TabsState.fromJSON(dto as any);

        if (mode === "replace") {
          Global.branchesProvider.insertOrUpdateBranch(branchName, importedState);
        } else {
          const existing = Global.branchesProvider.getBranchState(branchName);
          const merged = existing ? mergeTabsState(existing, importedState) : importedState;
          Global.branchesProvider.insertOrUpdateBranch(branchName, merged);
        }
      }

      vscode.window.showInformationMessage("Imported branch states successfully.");
      return;
    }

    // Case B: a map like exportJsonData() produces for "all branches": { [branchName]: TabsStateDTO }
    if (looksLikeBranchMap(json)) {
      const target = await vscode.window.showQuickPick(
        [
          {
            label: "Import into Branches (recommended)",
            description: "Load all branches into the Branches view (non-active branch store)",
            value: "branches" as const,
          },
          {
            label: "Import into Current Branch only",
            description: "Pick one branch from the file and load it as current state",
            value: "current" as const,
          },
        ],
        { title: "This file looks like multiple branches. Where should it be imported?", ignoreFocusOut: true }
      );
      if (!target) return;

      if (target.value === "branches") {
        const mode = await confirmReplaceMerge("saved branch states");
        if (!mode) return;

        for (const [branchName, dto] of Object.entries(json as Record<string, TabsStateDTO>)) {
          const importedState = TabsState.fromJSON(dto as any);
          if (mode === "replace") {
            Global.branchesProvider.insertOrUpdateBranch(branchName, importedState);
          } else {
            const existing = Global.branchesProvider.getBranchState(branchName);
            const merged = existing ? mergeTabsState(existing, importedState) : importedState;
            Global.branchesProvider.insertOrUpdateBranch(branchName, merged);
          }
        }

        vscode.window.showInformationMessage("Imported branches file into Branches successfully.");
        return;
      } else {
        const branchNames = Object.keys(json);
        const pickedBranch = await vscode.window.showQuickPick(branchNames, {
          title: "Pick a branch from the file to load as Current Branch state",
          ignoreFocusOut: true,
        });
        if (!pickedBranch) return;

        const mode = await confirmReplaceMerge("current branch state");
        if (!mode) return;

        const importedState = TabsState.fromJSON((json as any)[pickedBranch]);
        if (mode === "replace") {
          Global.tabsProvider.resetState(importedState);
        } else {
          const existing = Global.tabsProvider.getState();
          Global.tabsProvider.resetState(mergeTabsState(existing, importedState));
        }

        vscode.window.showInformationMessage(`Imported '${pickedBranch}' into Current Branch successfully.`);
        return;
      }
    }

    // Case C: single TabsStateDTO (export of current branch)
    if (isTabsStateDTO(json)) {
      const mode = await confirmReplaceMerge("current branch state");
      if (!mode) return;

      const importedState = TabsState.fromJSON(json as any);
      if (mode === "replace") {
        Global.tabsProvider.resetState(importedState);
      } else {
        const existing = Global.tabsProvider.getState();
        Global.tabsProvider.resetState(mergeTabsState(existing, importedState));
      }

      vscode.window.showInformationMessage("Imported current branch state successfully.");
      return;
    }

    vscode.window.showErrorMessage(
      "Unrecognized Onetab JSON format. Expected a TabsState JSON or a branches map."
    );
  } catch (error: any) {
    Global.logger.error("Error during import: " + (error?.message ?? String(error)));
    vscode.window.showErrorMessage("An error occurred during import. See output for details.");
  }
}