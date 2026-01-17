// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as assert from "assert";
import * as vscode from "vscode";

suite("Blacklist Service Test Suite", () => {
  let originalConfig: string[] | undefined;

  setup(async () => {
    // Save original configuration
    const config = vscode.workspace.getConfiguration();
    originalConfig = config.get("onetab.blacklist");
  });

  teardown(async () => {
    // Restore original configuration (true = global/user settings)
    await vscode.workspace
      .getConfiguration()
      .update("onetab.blacklist", originalConfig, true);
    
    // Clear module cache to get fresh instance in next test
    delete require.cache[require.resolve("../../../utils/blacklistService")];
  });

  suite("Rule Parsing", () => {
    test("should parse file: prefix rule", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["file:/path/to/file.ts"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const rules = blacklistService.getRules();
      assert.strictEqual(rules.length, 1);
      assert.strictEqual(rules[0].type, "file");
      assert.strictEqual(rules[0].pattern, "/path/to/file.ts");

      blacklistService.dispose();
    });

    test("should parse regex: prefix rule", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["regex:^/path/.*\\.log$"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const rules = blacklistService.getRules();
      assert.strictEqual(rules.length, 1);
      assert.strictEqual(rules[0].type, "regex");
      assert.strictEqual(rules[0].pattern, "^/path/.*\\.log$");
      assert.ok(rules[0].regex instanceof RegExp);

      blacklistService.dispose();
    });

    test("should default to regex for rules without prefix", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["/path/.*\\.tmp$"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const rules = blacklistService.getRules();
      assert.strictEqual(rules.length, 1);
      assert.strictEqual(rules[0].type, "regex");
      assert.ok(rules[0].regex instanceof RegExp);

      blacklistService.dispose();
    });

    test("should handle invalid regex gracefully", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["regex:[invalid(regex"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const rules = blacklistService.getRules();
      assert.strictEqual(rules.length, 1);
      // Should fall back to file type
      assert.strictEqual(rules[0].type, "file");

      blacklistService.dispose();
    });
  });

  suite("File Pattern Matching", () => {
    test("should match exact file path", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["file:/path/to/file.ts"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri = vscode.Uri.file("/path/to/file.ts");
      assert.strictEqual(blacklistService.isBlacklisted(uri), true);

      blacklistService.dispose();
    });

    test("should not match different file path", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["file:/path/to/file.ts"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri = vscode.Uri.file("/path/to/other.ts");
      assert.strictEqual(blacklistService.isBlacklisted(uri), false);

      blacklistService.dispose();
    });

    test("should match directory with /** pattern", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["file:/path/to/dir/**"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri1 = vscode.Uri.file("/path/to/dir/file.ts");
      const uri2 = vscode.Uri.file("/path/to/dir/nested/file.ts");
      const uri3 = vscode.Uri.file("/path/to/other/file.ts");

      assert.strictEqual(blacklistService.isBlacklisted(uri1), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri2), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri3), false);

      blacklistService.dispose();
    });

    test("should match directory itself with /** pattern", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["file:/path/to/dir/**"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri = vscode.Uri.file("/path/to/dir");
      assert.strictEqual(blacklistService.isBlacklisted(uri), true);

      blacklistService.dispose();
    });
  });

  suite("Regex Pattern Matching", () => {
    test("should match regex pattern", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["regex:.*\\.log$"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri1 = vscode.Uri.file("/path/to/app.log");
      const uri2 = vscode.Uri.file("/path/to/file.ts");

      assert.strictEqual(blacklistService.isBlacklisted(uri1), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri2), false);

      blacklistService.dispose();
    });

    test("should match complex regex patterns", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", ["regex:^/node_modules/|^/dist/|.*\\.tmp$"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri1 = vscode.Uri.file("/node_modules/package/file.js");
      const uri2 = vscode.Uri.file("/dist/bundle.js");
      const uri3 = vscode.Uri.file("/src/temp.tmp");
      const uri4 = vscode.Uri.file("/src/file.ts");

      assert.strictEqual(blacklistService.isBlacklisted(uri1), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri2), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri3), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri4), false);

      blacklistService.dispose();
    });

    test("should handle backward compatibility (no prefix)", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", [".*\\.test\\.ts$"], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri1 = vscode.Uri.file("/src/app.test.ts");
      const uri2 = vscode.Uri.file("/src/app.ts");

      assert.strictEqual(blacklistService.isBlacklisted(uri1), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri2), false);

      blacklistService.dispose();
    });
  });

  suite("Multiple Rules", () => {
    test("should match any rule in blacklist", async () => {
      await vscode.workspace
        .getConfiguration()
        .update(
          "onetab.blacklist",
          [
            "file:/path/to/specific.ts",
            "regex:.*\\.log$",
            "file:/node_modules/**",
          ],
          true
        );

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri1 = vscode.Uri.file("/path/to/specific.ts");
      const uri2 = vscode.Uri.file("/app/debug.log");
      const uri3 = vscode.Uri.file("/node_modules/pkg/file.js");
      const uri4 = vscode.Uri.file("/src/app.ts");

      assert.strictEqual(blacklistService.isBlacklisted(uri1), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri2), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri3), true);
      assert.strictEqual(blacklistService.isBlacklisted(uri4), false);

      blacklistService.dispose();
    });

    test("should handle empty blacklist", async () => {
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", [], true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      const uri = vscode.Uri.file("/path/to/file.ts");
      assert.strictEqual(blacklistService.isBlacklisted(uri), false);

      blacklistService.dispose();
    });

    test("should not add duplicate rule", async () => {
      const existingRules = ["file:/existing.ts"];
      await vscode.workspace
        .getConfiguration()
        .update("onetab.blacklist", existingRules, true);

      const { blacklistService } = require("../../../utils/blacklistService");
      blacklistService.initialize();

      await blacklistService.addRule("file:/existing.ts");

      const updatedConfig = vscode.workspace
        .getConfiguration()
        .get("onetab.blacklist") as string[];
      
      assert.strictEqual(updatedConfig.length, 1);

      blacklistService.dispose();
    });
  });

  suite("Integration with notInBlackList", () => {
    test("should correctly filter tabs using blacklist", async () => {
      await vscode.workspace
        .getConfiguration()
        .update(
          "onetab.blacklist",
          [
            "file:/blacklisted/file.ts",
            "regex:.*\\.log$",
          ],
          true
        );

      delete require.cache[require.resolve("../../../utils/tab")];
      
      const { blacklistService } = require("../../../utils/blacklistService");
      const { notInBlackList } = require("../../../utils/tab");

      blacklistService.initialize();

      const tab1 = {
        input: new vscode.TabInputText(vscode.Uri.file("/blacklisted/file.ts")),
      } as vscode.Tab;

      const tab2 = {
        input: new vscode.TabInputText(vscode.Uri.file("/app/debug.log")),
      } as vscode.Tab;

      const tab3 = {
        input: new vscode.TabInputText(vscode.Uri.file("/src/app.ts")),
      } as vscode.Tab;

      assert.strictEqual(notInBlackList(tab1), false);
      assert.strictEqual(notInBlackList(tab2), false);
      assert.strictEqual(notInBlackList(tab3), true);

      blacklistService.dispose();
    });
  });
});
