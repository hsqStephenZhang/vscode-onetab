// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../global";
import { TabItem } from "./tabitem";
import { TabsGroup } from "./tabsgroup";
import { TabsGroupRow, TabItemRow } from "../db";

export class TabsState {
  public groups: Map<string, TabsGroup>;
  public blackList: Set<string>;
  private reverseIndex: Map<string, string[]>;

  // The branch name this state belongs to (null = active/main state)
  public branchName: string | null;

  public constructor(branchName: string | null = null) {
    this.groups = new Map();
    this.blackList = new Set();
    this.reverseIndex = new Map();
    this.branchName = branchName;
  }

  // --- LOAD FROM DB ---
  public static loadFromDb(branchName: string | null): TabsState {
    const state = new TabsState(branchName);
    const db = Global.sqlDb;

    const groupRows = db.getTabsGroups(branchName);

    for (const row of groupRows) {
      const group = TabsGroup.fromRow(row);
      const tabRows = db.getTabItems(row.id);

      for (const tabRow of tabRows) {
        const tab = TabItem.fromRow(tabRow);
        tab.parentId = group.id;
        group.tabs.push(tab);
      }

      if (group.id) {
        state.groups.set(group.id, group);
      }
    }

    state.rebuildReverseIndex();
    return state;
  }

  // --- SAVE TO DB ---
  public saveToDb(): Promise<void> {
    const db = Global.sqlDb;

    // Clear existing data for this branch
    db.clearTabsGroups(this.branchName);

    let sortOrder = 0;
    for (const group of this.getAllTabsGroupsSorted()) {
      if (!group.id) continue;

      const row: TabsGroupRow = {
        id: group.id,
        branch_name: this.branchName,
        label: group.getLabel(),
        pinned: group.isPinned() ? 1 : 0,
        tags: JSON.stringify(group.getTags()),
        create_time: group.createTime,
        sort_order: sortOrder++,
      };
      db.insertTabsGroup(row);

      let tabSortOrder = 0;
      for (const tab of group.getTabs()) {
        const tabRow: TabItemRow = {
          id: tab.id!,
          group_id: group.id,
          label: tab.getLabel(),
          file_uri: tab.fileUri.toString(),
          sort_order: tabSortOrder++,
        };
        db.insertTabItem(tabRow);
      }
    }

    return db.flush();
  }

  // --- SINGLE GROUP OPERATIONS (fine-grained updates) ---

  // Add new group and persist
  public async addTabsGroupToDb(group: TabsGroup): Promise<void> {
    if (!group.id) return Promise.resolve();
    const db = Global.sqlDb;
    const row: TabsGroupRow = {
      id: group.id,
      branch_name: this.branchName,
      label: group.getLabel(),
      pinned: group.isPinned() ? 1 : 0,
      tags: JSON.stringify(group.getTags()),
      create_time: group.createTime,
      sort_order: 0, // Initial sort order, will be updated on next full save if needed
    };
    db.insertTabsGroup(row);
    
    // Insert tabs for this group
    let tabSortOrder = 0;
    for (const tab of group.getTabs()) {
      const tabRow: TabItemRow = {
        id: tab.id!,
        group_id: group.id,
        label: tab.getLabel(),
        file_uri: tab.fileUri.toString(),
        sort_order: tabSortOrder++,
      };
      db.insertTabItem(tabRow);
    }
    return db.flush();
  }

  public async updateGroupPin(id: string, pinned: boolean): Promise<void> {
    const db = Global.sqlDb;
    db.updateTabsGroupPin(id, pinned ? 1 : 0);
    return db.flush();
  }

  public async updateGroupLabel(id: string, label: string): Promise<void> {
    const db = Global.sqlDb;
    db.updateTabsGroupLabel(id, label);
    return db.flush();
  }

  public async updateGroupTags(id: string, tags: string[]): Promise<void> {
    const db = Global.sqlDb;
    db.updateTabsGroupTags(id, JSON.stringify(tags));
    return db.flush();
  }

  public async removeTabFromDb(groupId: string, fsPath: string): Promise<void> {
    const db = Global.sqlDb;
    db.deleteTabItemByPath(groupId, fsPath);
    return db.flush();
  }

  public async addTabsToDb(groupId: string, tabs: TabItem[]): Promise<void> {
    const db = Global.sqlDb;
    const existingTabs = db.getTabItems(groupId);
    let tabSortOrder = existingTabs.length;

    for (const tab of tabs) {
      const tabRow: TabItemRow = {
        id: tab.id!,
        group_id: groupId,
        label: tab.getLabel(),
        file_uri: tab.fileUri.toString(),
        sort_order: tabSortOrder++,
      };
      db.insertTabItem(tabRow);
    }
    return db.flush();
  }

  public async replaceGroupTabs(groupId: string, newTabs: TabItem[]): Promise<void> {
    const db = Global.sqlDb;
    db.deleteTabItemsByGroupId(groupId);
    let tabSortOrder = 0;
    for (const tab of newTabs) {
      const tabRow: TabItemRow = {
        id: tab.id!,
        group_id: groupId,
        label: tab.getLabel(),
        file_uri: tab.fileUri.toString(),
        sort_order: tabSortOrder++,
      };
      db.insertTabItem(tabRow);
    }
    return db.flush();
  }

  public async deleteGroupFromDb(id: string): Promise<void> {
    const db = Global.sqlDb;
    db.deleteTabsGroup(id);
    return db.flush();
  }

  public saveGroup(group: TabsGroup): Promise<void> {
    if (!group.id) return Promise.resolve();

    const db = Global.sqlDb;

    const existingGroup = db.getTabsGroupById(group.id);
    const row: TabsGroupRow = {
      id: group.id,
      branch_name: this.branchName,
      label: group.getLabel(),
      pinned: group.isPinned() ? 1 : 0,
      tags: JSON.stringify(group.getTags()),
      create_time: group.createTime,
      sort_order: existingGroup?.sort_order ?? 0,
    };

    if (existingGroup) {
      db.updateTabsGroup(row);
    } else {
      db.insertTabsGroup(row);
    }

    // Replace all tabs for this group
    db.deleteTabItemsByGroupId(group.id);
    let tabSortOrder = 0;
    for (const tab of group.getTabs()) {
      const tabRow: TabItemRow = {
        id: tab.id!,
        group_id: group.id,
        label: tab.getLabel(),
        file_uri: tab.fileUri.toString(),
        sort_order: tabSortOrder++,
      };
      db.insertTabItem(tabRow);
    }

    return db.flush();
  }

  // --- INDEX MANAGEMENT ---

  private rebuildReverseIndex() {
    this.reverseIndex.clear();
    for (const group of this.groups.values()) {
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
      const newList = list.filter((id) => id !== groupId);
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
    if (!group.id) return;
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

  // --- UPDATED MUTATION METHODS (with fine-grained persistence) ---

  public setPinned(id: string, pinned: boolean = true) {
    const g = this.groups.get(id);
    if (g) {
      g.setPin(pinned);
      this.updateGroupPin(id, pinned); // async, fire-and-forget
    }
  }

  public setGroupLabel(id: string, label: string) {
    const g = this.groups.get(id);
    if (g) {
      g.setLabel(label);
      this.updateGroupLabel(id, label); // async, fire-and-forget
    }
  }

  public setGroupTags(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.setTags(tags);
      this.updateGroupTags(id, tags); // async, fire-and-forget
    }
  }

  public addTagsToGroup(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.extendTags(tags);
      this.updateGroupTags(id, g.getTags()); // async, fire-and-forget
    }
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
      this.replaceGroupTabs(id, newTabs); // async, fire-and-forget
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
      if (newTabs.length > 0) {
        this.addTabsToDb(id, newTabs); // async, fire-and-forget
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
        this.removeTabFromDb(groupId, fsPath); // async, fire-and-forget
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
        this.removeTabFromDb(gid, fsPath); // async, fire-and-forget
        if (group.getTabs().length === 0 && group.id) {
          this.groups.delete(group.id);
        }
      }
    }
  }

  // --- BULK OPERATIONS (use saveToDb for efficiency) ---

  public mergeTabsGroup(dst_id: string, src_ids: string[]) {
    const dst = this.groups.get(dst_id);
    if (!dst) return;

    const merged_labels: string[] = [];

    for (const src_id of src_ids) {
      if (!src_id || src_id === dst_id) continue;
      const srcGroup = this.groups.get(src_id);
      if (srcGroup) {
        const clonedTabs = srcGroup.getTabs().map((t) => {
          const nt = t.deepClone();
          nt.parentId = dst_id;
          return nt;
        });
        dst.extendTabs(clonedTabs);
        for (const tab of srcGroup.getTabs()) {
          this.addToReverseIndex(tab.fileUri.fsPath, dst_id);
        }
        merged_labels.push(srcGroup.label as string);
        if (!srcGroup.isPinned()) {
          this.tryRemoveTabsGroup(src_id);
        }
      }
    }

    if (merged_labels.length > 0) {
      dst.removeDuplicateTabs();
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

  // --- DEEP CLONE ---
  public deepClone(): TabsState {
    const newState = new TabsState(this.branchName);
    for (const group of this.groups.values()) {
      const newGroup = group.deepClone();
      if (newGroup.id) {
        newState.groups.set(newGroup.id, newGroup);
      }
    }
    for (const item of this.blackList) {
      newState.blackList.add(item);
    }
    newState.rebuildReverseIndex();
    return newState;
  }
}

export const EMPTY_STATE = new TabsState();