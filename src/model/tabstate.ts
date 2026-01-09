// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { TabItem } from "./tabitem";
import { TabsGroup } from "./tabsgroup";

// JSON Data Transfer Object
interface TabsStateDTO {
  groups: { [key: string]: any };
  blackList: string[];
}

export class TabsState {
  public groups: Map<string, TabsGroup>;
  public blackList: Set<string>;

  // Cache: Map from file path -> list of group IDs
  private reverseIndex: Map<string, string[]>;

  public constructor() {
    this.groups = new Map();
    this.blackList = new Set();
    this.reverseIndex = new Map();
  }

  // --- SERIALIZATION ---
  public toJSON(): TabsStateDTO {
    const groupsObj: { [key: string]: any } = {};
    for (const [id, group] of this.groups) {
      if (id) {
        groupsObj[id] = group.toJSON();
      }
    }

    return {
      groups: groupsObj,
      blackList: Array.from(this.blackList),
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJSON());
  }

  // --- DESERIALIZATION ---
  public static fromString(s: string): TabsState {
    try {
      const json = JSON.parse(s) as TabsStateDTO;
      return TabsState.fromJSON(json);
    } catch (e) {
      console.error("Failed to parse TabsState", e);
      return new TabsState();
    }
  }

  public static fromJSON(json: TabsStateDTO): TabsState {
    const state = new TabsState();

    if (Array.isArray(json.blackList)) {
      state.blackList = new Set(json.blackList);
    }

    if (json.groups) {
      for (const key of Object.keys(json.groups)) {
        const groupDTO = json.groups[key];
        const group = TabsGroup.fromJSON(groupDTO);

        // SAFETY CHECK: Ensure ID exists before setting in Map
        if (group.id) {
          state.groups.set(group.id, group);
        }
      }
    }

    state.rebuildReverseIndex();
    return state;
  }

  // --- DEEP CLONE ---
  public deepClone(): TabsState {
    const newState = new TabsState();

    // 1. Clone Groups
    for (const group of this.groups.values()) {
      const newGroup = group.deepClone();

      // SAFETY CHECK: Ensure new group has an ID
      if (newGroup.id) {
        newState.groups.set(newGroup.id, newGroup);
      }
    }

    // 2. Clone Blacklist
    for (const item of this.blackList) {
      newState.blackList.add(item);
    }

    // 3. Rebuild Index
    newState.rebuildReverseIndex();

    return newState;
  }

  // --- INDEX MANAGEMENT ---

  private rebuildReverseIndex() {
    this.reverseIndex.clear();
    for (const group of this.groups.values()) {
      // Skip groups without valid IDs
      if (!group.id) continue;

      for (const tab of group.getTabs()) {
        this.addToReverseIndex(tab.fileUri.fsPath, group.id);
      }
    }
  }

  private addToReverseIndex(fsPath: string, groupId: string) {
    let list = this.reverseIndex.get(fsPath);
    if (!list) {
      list = [];
      this.reverseIndex.set(fsPath, list);
    }
    if (!list.includes(groupId)) {
      list.push(groupId);
    }
  }

  private removeFromReverseIndex(fsPath: string, groupId: string) {
    const list = this.reverseIndex.get(fsPath);
    if (list) {
      const newList = list.filter(id => id !== groupId);
      if (newList.length === 0) {
        this.reverseIndex.delete(fsPath);
      } else {
        this.reverseIndex.set(fsPath, newList);
      }
    }
  }

  // --- METHODS ---

  public getGroup(id: string): TabsGroup | undefined {
    return this.groups.get(id);
  }

  public addTabsGroup(group: TabsGroup) {
    // SAFETY CHECK: Return early if ID is undefined
    if (!group.id) {
      return;
    }

    this.groups.set(group.id, group);

    for (const tab of group.getTabs()) {
      this.addToReverseIndex(tab.fileUri.fsPath, group.id);
    }
  }

  public removeTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group) {
      for (const tab of group.getTabs()) {
        this.removeFromReverseIndex(tab.fileUri.fsPath, id);
      }
      this.groups.delete(id);
    }
  }

  public tryRemoveTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group && !group.isPinned()) {
      this.removeTabsGroup(id);
    }
  }

  // ... (Getters/Setters below remain mostly the same, ensuring 'id' usage is safe) ...

  public getPinnedLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) => list.isPinned());
  }

  public getTitledLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) => !list.isUntitled());
  }

  public getTaggedLists(): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) => list.getTags().length !== 0);
  }

  public filter(filters: ((list: TabsGroup) => boolean)[]): TabsGroup[] {
    return Array.from(this.groups.values()).filter((list) =>
      filters.every((f) => f(list))
    );
  }

  public setPinned(id: string, pinned: boolean = true) {
    const g = this.groups.get(id);
    if (g) g.setPin(pinned);
  }

  public setGroupLabel(id: string, label: string) {
    const g = this.groups.get(id);
    if (g) g.setLabel(label);
  }

  public setGroupTags(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) g.setTags(tags);
  }

  public addTagsToGroup(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) g.extendTags(tags);
  }

  public setGroupTabs(id: string, newTabs: TabItem[]) {
    const g = this.groups.get(id);
    if (g) {
      const oldTabs = g.getTabs();
      for (const tab of oldTabs) {
        this.removeFromReverseIndex(tab.fileUri.fsPath, id);
      }
      g.setTabs(newTabs);
      for (const tab of newTabs) {
        this.addToReverseIndex(tab.fileUri.fsPath, id);
      }
    }
  }

  public addTabsToGroup(id: string, tabs: TabItem[]) {
    const g = this.groups.get(id);
    if (g) {
      const oldTabs = g.getTabs();
      const newTabs = tabs.filter((tab) => {
        return !oldTabs.some((t) => t.fileUri.fsPath === tab.fileUri.fsPath);
      });
      g.extendTabs(newTabs);
      for (const tab of newTabs) {
        this.addToReverseIndex(tab.fileUri.fsPath, id);
      }
    }
  }

  public removeTabFromGroup(groupId: string, fsPath: string) {
    const group = this.groups.get(groupId);
    if (group) {
      const originalLength = group.getTabs().length;
      group.setTabs(group.getTabs().filter((t) => t.fileUri.fsPath !== fsPath));

      if (group.getTabs().length < originalLength) {
        this.removeFromReverseIndex(fsPath, groupId);
      }

      if (group.getTabs().length === 0) {
        this.groups.delete(groupId);
      }
    }
  }

  public removeTabFromAllGroups(fsPath: string) {
    const includeTabGroups = this.reverseIndex.get(fsPath);
    if (!includeTabGroups) return;

    const groupsToRemove = [...includeTabGroups];

    for (const gid of groupsToRemove) {
      const group = this.groups.get(gid);
      if (group) {
        group.setTabs(group.getTabs().filter((t) => t.fileUri.fsPath !== fsPath));
        this.removeFromReverseIndex(fsPath, gid);
        if (group.getTabs().length === 0 && group.id) {
          this.groups.delete(group.id);
        }
      }
    }
  }

  public mergeTabsGroup(dst_id: string, src_ids: string[]) {
    const dst = this.groups.get(dst_id);
    if (!dst) return;

    const merged_labels: string[] = [];

    for (const src_id of src_ids) {
      if (!src_id || src_id === dst_id) continue;

      const srcGroup = this.groups.get(src_id);
      if (srcGroup) {

        const clonedTabs = srcGroup.getTabs().map(t => {
          const nt = t.deepClone();     // new UUID id
          nt.parentId = dst_id;         // re-parent
          return nt;
        });

        dst.extendTabs(clonedTabs);
        for (const tab of srcGroup.getTabs()) {
          this.addToReverseIndex(tab.fileUri.fsPath, dst_id);
        }
        merged_labels.push(srcGroup.label as string);
        this.tryRemoveTabsGroup(src_id);
      }
    }

    dst.removeDuplicateTabs();

    if (merged_labels.length > 0) {
      dst.setLabel(dst.label + " (merged with: " + merged_labels.join(", ") + ")");
    }
  }

  public getAllTabsGroupsSorted(): TabsGroup[] {
    const pinnedIds = new Set<string>();
    const namedIds = new Set<string>();
    const taggedIds = new Set<string>();

    for (const group of this.groups.values()) {
      if (!group.id) continue;
      if (group.isPinned()) pinnedIds.add(group.id);
      if (!group.isUntitled()) namedIds.add(group.id);
      if (group.getTags().length > 0) taggedIds.add(group.id);
    }

    return Array.from(this.groups.values())
      .map((group) => {
        let score = 0;
        if (group.id) {
          if (pinnedIds.has(group.id)) score += 100;
          if (namedIds.has(group.id)) score += 10;
          if (taggedIds.has(group.id)) score += 1;
        }
        return { group, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.group.createTime - a.group.createTime;
      })
      .map((item) => item.group);
  }
}

export const EMPTY_STATE = new TabsState();