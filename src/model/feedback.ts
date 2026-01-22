import * as vscode from "vscode";
import { Command } from "vscode";

export class FeedBackItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: Command,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);
    this.command = command;
    this.iconPath = iconPath;
  }
}

export class Link {
  constructor(
    public readonly label: string,
    public readonly icon: string,
    public readonly url: string,
  ) {}
}

export class ReviewIssuesLink extends Link {
  constructor(url: string) {
    super("Review Issues", "info", url);
  }
}

export class ReportIssueLink extends Link {
  constructor(public url: string) {
    super("Report Issue", "comment", url);
  }
}

export class SupportLink extends Link {
  constructor(public url: string) {
    super("Support", "heart", url);
  }
}
