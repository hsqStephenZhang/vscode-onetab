// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import * as path from "path";

interface BlacklistRule {
  raw: string;
  type: "file" | "regex";
  pattern: string;
  regex?: RegExp;
}

/**
 * Service for managing and caching blacklist rules.
 * Supports two types of rules:
 * - "file:path/to/file" - exact file path matching
 * - "regex:pattern" - regular expression matching
 */
class BlacklistService {
  private cachedRules: BlacklistRule[] = [];
  private disposable: vscode.Disposable | undefined;

  /**
   * Initialize the blacklist service and set up configuration listener
   */
  public initialize(): void {
    this.updateCache();

    // Listen for configuration changes
    this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("onetab.blacklist")) {
        this.updateCache();
      }
    });
  }

  /**
   * Update the cache by reading configuration and compiling rules
   */
  private updateCache(): void {
    const blacklist = vscode.workspace
      .getConfiguration()
      .get("onetab.blacklist") as Array<string>;

    if (!blacklist || blacklist.length === 0) {
      this.cachedRules = [];
      return;
    }

    this.cachedRules = blacklist.map((rule) => this.parseRule(rule));
  }

  /**
   * Parse a blacklist rule string into a BlacklistRule object
   */
  private parseRule(rule: string): BlacklistRule {
    const filePrefix = "file:";
    const regexPrefix = "regex:";

    if (rule.startsWith(filePrefix)) {
      return {
        raw: rule,
        type: "file",
        pattern: rule.substring(filePrefix.length),
      };
    } else if (rule.startsWith(regexPrefix)) {
      const pattern = rule.substring(regexPrefix.length);
      try {
        return {
          raw: rule,
          type: "regex",
          pattern: pattern,
          regex: new RegExp(pattern),
        };
      } catch (error) {
        // If regex compilation fails, treat it as a literal string match
        console.error(`Failed to compile regex: ${pattern}`, error);
        return {
          raw: rule,
          type: "file",
          pattern: pattern,
        };
      }
    } else {
      // Default to regex for backward compatibility
      try {
        return {
          raw: rule,
          type: "regex",
          pattern: rule,
          regex: new RegExp(rule),
        };
      } catch (error) {
        console.error(`Failed to compile regex: ${rule}`, error);
        return {
          raw: rule,
          type: "file",
          pattern: rule,
        };
      }
    }
  }

  /**
   * Check if a URI matches any blacklist rule
   */
  public isBlacklisted(uri: vscode.Uri): boolean {
    if (this.cachedRules.length === 0) {
      return false;
    }

    const uriPath = uri.path;

    for (const rule of this.cachedRules) {
      if (rule.type === "file") {
        // For file rules, check exact path match or glob-style pattern
        if (this.matchFilePattern(uriPath, rule.pattern)) {
          return true;
        }
      } else if (rule.type === "regex" && rule.regex) {
        // For regex rules, use the compiled regex
        if (rule.regex.test(uriPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Match a file path against a pattern (supports /** for directory matching)
   */
  private matchFilePattern(filePath: string, pattern: string): boolean {
    // Exact match
    if (filePath === pattern) {
      return true;
    }

    // Handle directory glob pattern (e.g., /path/to/dir/**)
    if (pattern.endsWith("/**")) {
      const dirPath = pattern.substring(0, pattern.length - 3);
      if (filePath.startsWith(dirPath + "/") || filePath === dirPath) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add a new rule to the blacklist
   */
  public async addRule(rule: string): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    let blacklist = config.get("onetab.blacklist") as Array<string>;

    if (!blacklist) {
      blacklist = [];
    }

    if (!blacklist.includes(rule)) {
      blacklist.push(rule);
      await config.update("onetab.blacklist", blacklist, false);
      // Cache will be automatically updated via configuration listener
    }
  }

  /**
   * Get all cached rules (for debugging/display purposes)
   */
  public getRules(): BlacklistRule[] {
    return [...this.cachedRules];
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.disposable?.dispose();
  }
}

// Singleton instance
export const blacklistService = new BlacklistService();
