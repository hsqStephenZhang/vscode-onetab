import * as vscode from "vscode";
import * as fs from "fs";
import { Global } from "../global";
import { instanceToPlain, serialize } from "class-transformer";

export async function exportJsonData() {
    // 1. export current branch state to json
    const jsonData = Global.tabsProvider.getState().toString()
    const dataStr = jsonData;
    //   const dataStr = JSON.stringify(jsonData, null, 4); // beautify the JSON
    Global.logger.info("Exporting JSON data: " + dataStr);

    // Ask the user for a location to save the file
    const uri = await vscode.window.showSaveDialog({
        title: "export current branch state to json",
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

    // 2. export all branches' states to json
    const jsonData2 = JSON.stringify(instanceToPlain(Global.branchesProvider.getStates()))
    const dataStr2 = jsonData2;
    //   const dataStr = JSON.stringify(jsonData, null, 4); // beautify the JSON
    Global.logger.info("Exporting JSON data: " + dataStr2);

    // Ask the user for a location to save the file
    const uri2 = await vscode.window.showSaveDialog({
        title: "export all branches' states to json",
        filters: {
            "JSON files": ["json"],
        },
    });

    if (uri2 && uri2.fsPath) {
        // Write the JSON string to the selected file
        fs.writeFile(uri2.fsPath, dataStr2, "utf8", (err: any) => {
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
