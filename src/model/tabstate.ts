// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import 'reflect-metadata';
import { instanceToPlain, plainToInstance, plainToClass, Transform } from 'class-transformer';
import { TabItem } from "./tabitem";
import { TabsGroup } from "./tabsgroup";

/// tabs state 
///     => groups: Map<string, TabsGroup>
///          => TabItem[]

export class TabsState {
  @Transform(value => {
    let map = new Map<string, TabsGroup>();
    for (let entry of Object.entries(value.value)) { map.set(entry[0], plainToClass(TabsGroup, entry[1])); }
    return map;
  }, { toClassOnly: true })
  public groups: Map<string, TabsGroup>;

  // black list of file
  @Transform(value => {
    let set = new Set<string>();
    for (let entry of Object.entries(value.value)) { set.add(entry[0]); }
    return set;
  }, { toClassOnly: true })
  public blackList: Set<string>;

  // map from uri.fsPath to group id list
  @Transform(value => {
    let map = new Map<string, string[]>();
    for (let entry of Object.entries(value.value)) { map.set(entry[0], plainToClass(Array<string>, entry[1])); }
    return map;
  }, { toClassOnly: true })
  private reverseIndex: Map<string, string[]>;

  public constructor() {
    this.groups = new Map();
    this.blackList = new Set();
    this.reverseIndex = new Map();
  }

  // deep copy the state, change the inner ids
  public deepClone(): TabsState {
    let newState = new TabsState();
    let groupIdDiff = new Map<string, string>();
    for (const [k, group] of this.groups) {
      let newGroup = group.deepClone();
      if (group.id && newGroup.id) {
        groupIdDiff.set(group.id, newGroup.id);
      }
      newState.groups.set(k, newGroup);
    }
    for (const k of this.blackList) {
      newState.blackList.add(k);
    }
    // update the reverseIndex, which is a map from fsPath to group ids
    for (const [k, groupIds] of this.reverseIndex) {
      let newGroupids = groupIds.map((gid) => {
        let newId = groupIdDiff.get(gid);
        if (newId) {
          return newId;
        } else {
          return gid;
        }
      });
      newState.reverseIndex.set(k, newGroupids);
    }
    // update the groups 
    let newGroupEntries = Array.from(newState.groups.entries());
    for (const [k, group] of newGroupEntries) {
      let newGroupId = groupIdDiff.get(k);
      if (newGroupId) {
        newState.groups.delete(k);
        newState.groups.set(newGroupId, group);
      }
    }
    return newState;
  }


  public toString(): string {
    return JSON.stringify(instanceToPlain(this));
  }

  // TODO: fixme
  public static fromString(s: string): TabsState {
    let state = plainToInstance(TabsState, JSON.parse(s));
    for (const [k, group] of state.groups) {
      group.setPin(group.isPinned());
      for (const tab of group.getTabs()) {
        tab.setDefaultIcon();
      }
    }
    return state;
  }

  // getters

  public getGroup(id: string): TabsGroup | undefined {
    return this.groups.get(id);
  }

  public getPinnedLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) => list.isPinned());
  }

  public getTitledLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter(
      (list) => !list.isUntitled()
    );
  }

  public getTaggedLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter(
      (list) => list.getTags().length !== 0
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

  public setGroupLabel(id: string, label: string) {
    const g = this.groups.get(id);
    if (g) {
      g.setLabel(label);
    }
  }

  public setGroupTags(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.setTags(tags);
      g.tooltip =
        g.label + ", tags: " + (tags.length === 0 ? "none" : tags.join(", "));
    }
  }

  public addTagsToGroup(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.extendTags(tags);
    }
  }

  public setGroupTabs(id: string, newTabs: TabItem[]) {
    const g = this.groups.get(id);
    if (g) {
      let oldTabs = g.getTabs();
      g.setTabs(newTabs);

      // update for old
      for (const tab of oldTabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          continue;
        } else {
          includeTabGroups = includeTabGroups.filter((gid) => gid !== id);
          if (includeTabGroups.length === 0) {
            this.reverseIndex.delete(fsPath);
          } else {
            this.reverseIndex.set(fsPath, includeTabGroups);
          }
        }
      }

      // update for new
      for (const tab of newTabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          this.reverseIndex.set(fsPath, [id]);
        } else {
          includeTabGroups.push(id);
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }
    }
  }

  public addTabsToGroup(id: string, tabs: TabItem[]) {
    const g = this.groups.get(id);
    if (g) {
      let oldTabs = g.getTabs();
      let newTabs = tabs.filter((tab) => {
        return !oldTabs.some((t) => t.fileUri.fsPath === tab.fileUri.fsPath);
      });
      g.extendTabs(newTabs);

      for (const tab of newTabs) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          this.reverseIndex.set(fsPath, [id]);
        } else {
          includeTabGroups.push(id);
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }
    }
  }

  public addTabsGroup(group: TabsGroup) {
    if (!group.id) {
      return;
    }
    this.groups.set(group.id, group);

    for (const tab of group.getTabs()) {
      let fsPath = tab.fileUri.fsPath;
      let includeTabGroups = this.reverseIndex.get(fsPath);
      if (includeTabGroups === undefined) {
        this.reverseIndex.set(fsPath, [group.id]);
      } else {
        includeTabGroups.push(group.id);
        this.reverseIndex.set(fsPath, includeTabGroups);
      }
    }
  }

  // try to removed the group, if the group is not pinnned
  public tryRemoveTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group) {
      if (!group.isPinned()) {
        this.removeTabsGroup(id);
      }
    }
  }

  // force removing the 
  public removeTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group) {
      for (const tab of group.getTabs()) {
        let fsPath = tab.fileUri.fsPath;
        let includeTabGroups = this.reverseIndex.get(fsPath);
        if (includeTabGroups === undefined) {
          continue;
        } else {
          includeTabGroups = includeTabGroups.filter((gid) => gid !== id);
          if (includeTabGroups.length === 0) {
            this.reverseIndex.delete(fsPath);
          } else {
            this.reverseIndex.set(fsPath, includeTabGroups);
          }
        }
      }
      this.groups.delete(id);
    }
  }

  // TODO: fixme, use the tab's id instead of fsPath
  public removeTabFromGroup(groupId: string, fsPath: string) {
    const group = this.groups.get(groupId);
    if (group) {
      group.setTabs(group.getTabs().filter((t) => t.fileUri.fsPath !== fsPath));
      let includeTabGroups = this.reverseIndex.get(fsPath);
      if (includeTabGroups === undefined) {
        return;
      } else {
        includeTabGroups = includeTabGroups.filter((gid) => gid !== groupId);
        if (includeTabGroups.length === 0) {
          this.reverseIndex.delete(fsPath);
        } else {
          this.reverseIndex.set(fsPath, includeTabGroups);
        }
      }

      if (group.getTabs().length === 0) {
        this.groups.delete(groupId);
      }
    }
  }

  public removeTabFromAllGroups(fsPath: string) {
    let includeTabGroups = this.reverseIndex.get(fsPath);
    if (includeTabGroups === undefined) {
      return;
    } else {
      for (const gid of includeTabGroups) {
        const group = this.groups.get(gid);
        if (group) {
          group.setTabs(group.getTabs().filter((t) => t.fileUri.fsPath !== fsPath));
          if (group.getTabs().length === 0 && group.id) {
            this.groups.delete(group.id);
          }
        }
      }
      this.reverseIndex.delete(fsPath);
    }
  }

  public mergeTabsGroup(dst_id: string, src_ids: (string | undefined)[]) {
    const dst = this.groups.get(dst_id);

    if (dst) {
      // let merged_labels = "";
      let merged_labels: string[] = [];
      for (const src_id of src_ids) {
        if (src_id === undefined) {
          continue;
        }
        const srcGroup = this.groups.get(src_id);
        if (srcGroup) {
          for (const tab of srcGroup.getTabs()) {
            let fsPath = tab.fileUri.fsPath;
            let includeTabGroups = this.reverseIndex.get(fsPath);
            if (includeTabGroups === undefined) {
              this.reverseIndex.set(fsPath, [dst_id]);
            } else {
              includeTabGroups.push(dst_id);
              this.reverseIndex.set(fsPath, includeTabGroups);
            }
          }
          dst.extendTabs(srcGroup.getTabs());
          merged_labels.push(srcGroup.label);
          this.tryRemoveTabsGroup(src_id);
        }
      }
      dst.removeDuplicateTabs()
      if (merged_labels.length > 0) {
        dst.setLabel(dst.label + "(merged with:" + merged_labels.join(", ") + ")");
      }
    }
  }

  public getAllTabsGroupsSorted(): TabsGroup[] {
    let pinnedGroups = new Map(
      Array.from(this.groups.values())
        .filter((item) => item.isPinned())
        .map((item) => [item.id, true])
    );
    let namedGroups = new Map(
      Array.from(this.groups.values())
        .filter((item) => !item.isUntitled())
        .map((item) => [item.id, true])
    );
    let taggedGroups = new Map(
      Array.from(this.groups.values())
        .filter((item) => item.getTags().length !== 0)
        .map((item) => [item.id, true])
    );
    // order by: 1. pinned, 2. named, 3. create time
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
        return b.group.createTime - a.group.createTime;
      })
      .sort((a, b) => {
        return b.score - a.score;
      })
      .map((item) => item.group);

    return sortedGroups;
  }
}

export const EMPTY_STATE = new TabsState();