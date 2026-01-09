import * as vscode from "vscode";
import * as fs from "fs";
import { Global } from "../global";

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