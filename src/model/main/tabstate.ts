// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { TabItem } from "./tabitem";
import { TabsGroup } from "./tabsgroup";

export class TabsState {
  public groups: Map<string, TabsGroup> = new Map();

  // map from uri.fsPath to group id list
  private reverseIndex: Map<string, TabsGroup[]> = new Map();

  // getters

  public getGroup(id: string): TabsGroup | undefined {
    return this.groups.get(id);
  }

  public getPinnedLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) => list.pinned);
  }

  public getTitledLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter(
      (list) => !list.isUntitled()
    );
  }

  public getTaggedLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter(
      (list) => list.tags.length !== 0
    );
  }

  public filter(filters: ((list: TabsGroup) => boolean)[]): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) =>
      filters.every((f) => f(list))
    );
  }

  // setters

  public setPinned(id: string, pinned: boolean = true) {
    const g = this.groups.get(id);
    if (g) {
      g.setPin(pinned);
    }
  }

  public setLabelToGroup(id: string, label: string) {
    const g = this.groups.get(id);
    if (g) {
      g.label = label;
    }
  }

  public setTagsToGroup(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.tags = tags;
    }
  }

  public addTagsToGroup(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.tags = g.tags.concat(tags);
    }
  }

  public setTabsOfGroup(id: string, newTabs: TabItem[]) {
    const g = this.groups.get(id);
    if (g) {
      let oldTabs = g.tabs;
      g.tabs = newTabs;

      // update for old
      for (const tab of oldTabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          continue;
        } else {
          includeTabGroups = includeTabGroups.filter((g) => g.id !== id);
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }

      // update for new
      for (const tab of newTabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          this.reverseIndex.set(fsPath, [g]);
        } else {
          includeTabGroups.push(g);
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }
    }
  }

  public addTabsToGroup(id: string, tabs: TabItem[]) {
    const g = this.groups.get(id);
    if (g) {
      g.tabs = g.tabs.concat(tabs);

      for (const tab of tabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          this.reverseIndex.set(fsPath, [g]);
        } else {
          includeTabGroups.push(g);
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }
    }
  }

  public addTabsGroup(group: TabsGroup) {
    this.groups.set(group.id, group);

    for (const tab of group.tabs) {
      let fsPath = tab.fileUri.fsPath;
      let includeTabGroups = this.reverseIndex.get(fsPath);
      if (includeTabGroups === undefined) {
        this.reverseIndex.set(fsPath, [group]);
      } else {
        includeTabGroups.push(group);
        this.reverseIndex.set(fsPath, includeTabGroups);
      }
    }
  }

  public removeTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group) {
      for (const tab of group.tabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          continue;
        } else {
          includeTabGroups = includeTabGroups.filter((g) => g.id !== id);
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }
      this.groups.delete(id);
    }
  }

  public removeTabFromGroup(id: string, fsPath: string) {
    const group = this.groups.get(id);
    if (group) {
      group.tabs = group.tabs.filter((t) => t.fileUri.fsPath !== fsPath);

      let includeTabGroups = this.reverseIndex.get(fsPath);
      if (includeTabGroups === undefined) {
        return;
      } else {
        includeTabGroups = includeTabGroups.filter((g) => g.id !== id);
        this.reverseIndex.set(fsPath, includeTabGroups);
      }

      if (group.tabs.length === 0) {
        this.groups.delete(id);
      }
    }
  }

  public removeTabFromAllGroups(fsPath: string) {
    let includeTabGroups = this.reverseIndex.get(fsPath);
    if (includeTabGroups === undefined) {
      return;
    } else {
      for (const group of includeTabGroups) {
        group.tabs = group.tabs.filter((t) => t.fileUri.fsPath !== fsPath);
        if (group.tabs.length === 0) {
          this.groups.delete(group.id);
        }
      }
      this.reverseIndex.delete(fsPath);
    }
  }

  public getAllTabsGroupsSorted(): TabsGroup[] {
    let pinnedGroups = new Map(
      Array.from(this.groups.values())
        .filter((item) => item.pinned)
        .map((item) => [item.id, true])
    );
    let namedGroups = new Map(
      Array.from(this.groups.values())
        .filter((item) => !item.isUntitled())
        .map((item) => [item.id, true])
    );
    let taggedGroups = new Map(
      Array.from(this.groups.values())
        .filter((item) => item.tags.length !== 0)
        .map((item) => [item.id, true])
    );
    let sortedGroups = Array.from(this.groups.values())
      .map((item) => {
        let score = 0;
        if (pinnedGroups.has(item.id)) {
          score += 100;
        }
        if (namedGroups.has(item.id)) {
          score += 10;
        }
        if (taggedGroups.has(item.id)) {
          score += 1;
        }
        return { group: item, score: score };
      })
      .sort((a, b) => {
        return b.score - a.score;
      })
      .map((item) => item.group);

    return sortedGroups;
  }
}
