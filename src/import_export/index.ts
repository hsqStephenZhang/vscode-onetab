import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Global } from "../global";
import { TabsState } from "../model/tabstate";
import { TabsGroup } from "../model/tabsgroup";
import { TabItem } from "../model/tabitem";


// =====================================================
// DTOs for JSON Export/Import (backward compatible format)
// =====================================================

interface TabItemDTO {
  id: string;
  label: string;
  fileUri: string;
}

interface TabsGroupDTO {
  id: string;
  label: string;
  pinned: boolean;
  tags: string[];
  createTime: number;
  tabs: TabItemDTO[];
}

interface TabsStateDTO {
  groups?: Record<string, TabsGroupDTO>;
  blackList?: string[];
}

// =====================================================
// Serialization: TabsState -> DTO
// =====================================================

function tabItemToDTO(item: TabItem): TabItemDTO {
  return {
    id: item.id || "",
    label: item.getLabel(),
    fileUri: item.fileUri.toString(),
  };
}

function tabsGroupToDTO(group: TabsGroup): TabsGroupDTO {
  return {
    id: group.id || "",
    label: group.getLabel(),
    pinned: group.isPinned(),
    tags: group.getTags(),
    createTime: group.createTime,
    tabs: group.getTabs().map(tabItemToDTO),
  };
}

function tabsStateToDTO(state: TabsState): TabsStateDTO {
  const groupsObj: Record<string, TabsGroupDTO> = {};
  for (const [id, group] of state.groups) {
    if (id) {
      groupsObj[id] = tabsGroupToDTO(group);
    }
  }
  return {
    groups: groupsObj,
    blackList: Array.from(state.blackList),
  };
}

// =====================================================
// Deserialization: DTO -> TabsState
// =====================================================

function tabItemFromDTO(dto: TabItemDTO): TabItem {
  const uri = vscode.Uri.parse(dto.fileUri);
  return new TabItem(uri, dto.id, dto.label);
}

function tabsGroupFromDTO(dto: TabsGroupDTO): TabsGroup {
  const group = new TabsGroup(dto.id, dto.label);
  group.createTime = dto.createTime ?? Date.now();
  group.setTags(dto.tags ?? []);
  group.setPin(dto.pinned ?? false);

  if (Array.isArray(dto.tabs)) {
    const tabs = dto.tabs.map((t) => {
      const tab = tabItemFromDTO(t);
      tab.parentId = group.id;
      return tab;
    });
    group.setTabs(tabs);
  }

  return group;
}

function tabsStateFromDTO(dto: TabsStateDTO, branchName: string | null = null): TabsState {
  const state = new TabsState(branchName);

  if (dto.groups) {
    for (const key of Object.keys(dto.groups)) {
      const groupDTO = dto.groups[key];
      const group = tabsGroupFromDTO(groupDTO);
      if (group.id) {
        state.groups.set(group.id, group);
      }
    }
  }

  if (Array.isArray(dto.blackList)) {
    for (const item of dto.blackList) {
      state.blackList.add(item);
    }
  }

  return state;
}

// =====================================================
// Type Guards
// =====================================================

function isTabsStateDTO(value: any): value is TabsStateDTO {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  const sampleKeys = keys.slice(0, Math.min(5, keys.length));
  let ok = 0;
  for (const k of sampleKeys) {
    if (isTabsStateDTO((value as any)[k])) ok++;
  }
  return ok >= Math.max(1, Math.floor(sampleKeys.length / 2));
}

// =====================================================
// Helpers
// =====================================================

async function readJsonFile(uri: vscode.Uri): Promise<any> {
  const buf = await fs.promises.readFile(uri.fsPath);
  const text = buf.toString("utf8");
  return JSON.parse(text);
}

async function confirmReplaceMerge(scopeLabel: string): Promise<"replace" | "merge" | undefined> {
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
  const merged = dst.deepClone();

  for (const [gid, group] of src.groups) {
    if (gid) {
      // Clone the source group and add it (overwrites if ID exists)
      const clonedGroup = group.deepClone();
      // Preserve original ID for imported data
      if (group.id) {
        clonedGroup.id = group.id;
      }
      merged.groups.set(clonedGroup.id!, clonedGroup);
    }
  }

  for (const item of src.blackList) {
    merged.blackList.add(item);
  }

  return merged;
}

// =====================================================
// Export Functions
// =====================================================

export async function exportJsonData() {
  try {
    // =========================================================
    // 1. Export Current Branch State
    // =========================================================
    const currentState = Global.tabsProvider.getState();
    const currentDto = tabsStateToDTO(currentState);
    const currentDataStr = JSON.stringify(currentDto, null, 4);

    Global.logger.info("Exporting Current Branch JSON data length: " + currentDataStr.length);

    const uri = await vscode.window.showSaveDialog({
      title: "Export Current Branch State",
      defaultUri: vscode.Uri.file(path.join(os.homedir(), "Downloads", "current-branch-tabs.json")),
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

    // If there is only one branch or no branches, skip exporting all branches
    const allBranchNames = Global.branchesProvider.allBranches();
    if (allBranchNames.length === 0) {
      Global.logger.info("No branches exist, skipping export of all branches.");
      return;
    }

    // =========================================================
    // 2. Export All Branches' States
    // =========================================================
    const allStatesObj: Record<string, TabsStateDTO> = {};

    for (const branchName of allBranchNames) {
      const branchState = Global.branchesProvider.getBranchState(branchName);
      if (branchState) {
        allStatesObj[branchName] = tabsStateToDTO(branchState);
      }
    }

    const allDataStr = JSON.stringify(allStatesObj, null, 4);
    Global.logger.info("Exporting All Branches JSON data length: " + allDataStr.length);

    const uri2 = await vscode.window.showSaveDialog({
      title: "Export All Branches' States",
      defaultUri: vscode.Uri.file(path.join(os.homedir(), "Downloads", "all-branches-tabs.json")),
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

// =====================================================
// Import Functions
// =====================================================

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
        const importedState = tabsStateFromDTO(dto as TabsStateDTO, branchName);

        if (mode === "replace") {
          Global.branchesProvider.insertOrUpdateBranch(branchName, importedState);
        } else {
          const existing = Global.branchesProvider.getBranchState(branchName);
          const merged = existing ? mergeTabsState(existing, importedState) : importedState;
          merged.branchName = branchName;
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
          const importedState = tabsStateFromDTO(dto, branchName);
          if (mode === "replace") {
            Global.branchesProvider.insertOrUpdateBranch(branchName, importedState);
          } else {
            const existing = Global.branchesProvider.getBranchState(branchName);
            const merged = existing ? mergeTabsState(existing, importedState) : importedState;
            merged.branchName = branchName;
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

        const importedState = tabsStateFromDTO((json as any)[pickedBranch], null);
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

      const importedState = tabsStateFromDTO(json, null);
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