// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {
  runTests,
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} from "@vscode/test-electron";
import { spawnSync } from "child_process";

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Download VS Code
    const vscodeExecutablePath = await downloadAndUnzipVSCode();
    const [cliPath, ...args] =
      resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Create a custom extensions directory for test isolation
    const testExtensionsDir = path.join(os.tmpdir(), "onetab-test-extensions");
    if (!fs.existsSync(testExtensionsDir)) {
      fs.mkdirSync(testExtensionsDir, { recursive: true });
    }

    // Install only the extensions we need into the isolated directory
    console.log("Installing Jupyter extension...");
    const installResult = spawnSync(
      cliPath,
      [
        ...args,
        "--extensions-dir",
        testExtensionsDir,
        "--install-extension",
        "ms-toolsai.jupyter",
      ],
      {
        encoding: "utf-8",
        stdio: "inherit",
      },
    );

    if (installResult.status !== 0) {
      console.warn(
        "Warning: Failed to install Jupyter extension, notebook tests will be skipped",
      );
    }

    // Run tests with only our isolated extensions directory
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        // Use custom extensions directory (only contains Jupyter)
        "--extensions-dir",
        testExtensionsDir,
        // Enable proposed API for git
        "--enable-proposed-api",
        "vscode.git",
      ],
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

main();
