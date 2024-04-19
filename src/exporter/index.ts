import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { STORAGE_KEY } from "../constant";
import { WorkState } from "../common/state";
import { Global } from "../common/global";

export async function exportJsonData() {
  // Serialize the JSON data
  const jsonData = WorkState.get(STORAGE_KEY, Global.tabsState.toString());
  const dataStr = jsonData;
//   const dataStr = JSON.stringify(jsonData, null, 4); // beautify the JSON
  Global.logger.info("Exporting JSON data: " + dataStr);

  // Ask the user for a location to save the file
  const uri = await vscode.window.showSaveDialog({
    filters: {
      "JSON files": ["json"],
    },
  });

  if (uri && uri.fsPath) {
    // Write the JSON string to the selected file
    fs.writeFile(uri.fsPath, dataStr, "utf8", (err: any) => {
      if (err) {
        vscode.window.showErrorMessage(
          "Failed to save the file: " + err.message
        );
      } else {
        vscode.window.showInformationMessage("File saved successfully!");
      }
    });
  } else {
    vscode.window.showErrorMessage("No file selected.");
  }
}
