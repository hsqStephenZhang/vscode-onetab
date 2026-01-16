// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import { Global } from "../global";
import { TabItem } from "./tabitem";
import { TabsGroup } from "./tabsgroup";
import { TabsGroupRow, TabItemRow } from "../db/storageService";
import { DEFAULT_SORTING_STRATEGY, SORTING_STRATEGY_CONFIG_KEY, SortingStrategy } from "../constant";
import { SortingService } from "../utils/sortingService";

export class TabsState {
  public groups: Map<string, TabsGroup>;
  public blackList: Set<string>;
  private reverseIndex: Map<string, string[]>;

  // The branch name this state belongs to (null = active/main state)
  public branchName: string | null;

  // Track which groups have been modified for selective persistence
  private dirtyGroups: Set<string> = new Set();
  private deletedGroups: Set<string> = new Set();

  public constructor(branchName: string | null = null) {
    this.groups = new Map();
    this.blackList = new Set();
    this.reverseIndex = new Map();
    this.branchName = branchName;
    this.dirtyGroups = new Set();
    this.deletedGroups = new Set();
  }

  // --- LOAD FROM STORAGE ---
  public static loadFromStorage(branchName: string | null): TabsState {
    const state = new TabsState(branchName);
    const storage = Global.storage;

    const groupRows = storage.getTabsGroups(branchName);

    for (const row of groupRows) {
      const group = TabsGroup.fromRow(row);
      const tabRows = storage.getTabItems(row.id);

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

  // --- MARK DIRTY ---
  private markDirty(groupId: string): void {
    this.dirtyGroups.add(groupId);
    this.deletedGroups.delete(groupId); // Remove from deleted if re-adding
  }

  private markDeleted(groupId: string): void {
    this.dirtyGroups.delete(groupId);
    this.deletedGroups.add(groupId);
  }

  // --- SELECTIVE SAVE (only affected groups) ---
  public async persistChanges(): Promise<void> {
    const storage = Global.storage;

    // Delete removed groups
    for (const groupId of this.deletedGroups) {
      await storage.deleteTabsGroup(groupId);
    }
    this.deletedGroups.clear();

    // Save modified groups
    for (const groupId of this.dirtyGroups) {
      const group = this.groups.get(groupId);
      if (group) {
        const row: TabsGroupRow = {
          id: group.id!,
          branch_name: this.branchName,
          label: group.getLabel(),
          pinned: group.isPinned() ? 1 : 0,
          tags: JSON.stringify(group.getTags()),
          create_time: group.createTime,
          sort_order: 0, // Could track sort order if needed
        };
        await storage.insertTabsGroup(row);

        // Replace all tabs for this group
        await storage.deleteTabItemsByGroupId(groupId);
        let tabSortOrder = 0;
        for (const tab of group.getTabs()) {
          const tabRow: TabItemRow = {
            id: tab.id!,
            group_id: groupId,
            label: tab.getLabel(),
            file_uri: tab.fileUri.toString(),
            original_uri: tab.originalUri?.toString(),
            tab_type: tab.tabType,
            sort_order: tabSortOrder++,
          };
          await storage.insertTabItem(tabRow);
        }
      }
    }
    this.dirtyGroups.clear();
  }

  // --- FULL SAVE (for bulk operations) ---
  public async saveToStorage(): Promise<void> {
    const storage = Global.storage;

    // Clear existing data for this branch
    await storage.clearTabsGroups(this.branchName);

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
      await storage.insertTabsGroup(row);

      let tabSortOrder = 0;
      for (const tab of group.getTabs()) {
        const tabRow: TabItemRow = {
          id: tab.id!,
          group_id: group.id,
          label: tab.getLabel(),
          file_uri: tab.fileUri.toString(),
          original_uri: tab.originalUri?.toString(),
          tab_type: tab.tabType,
          sort_order: tabSortOrder++,
        };
        await storage.insertTabItem(tabRow);
      }
    }
    this.dirtyGroups.clear();
    this.deletedGroups.clear();
  }

  // --- SINGLE GROUP OPERATIONS (fine-grained updates) ---

  public async addTabsGroupToStorage(group: TabsGroup): Promise<void> {
    if (!group.id) return;

    this.markDirty(group.id);
    await this.persistChanges();
  }

  public async updateGroupPin(id: string, pinned: boolean): Promise<void> {
    const storage = Global.storage;
    this.markDirty(id);
    await storage.updateTabsGroupPin(id, pinned ? 1 : 0);
  }

  public async updateGroupLabel(id: string, label: string): Promise<void> {
    const storage = Global.storage;
    this.markDirty(id);
    await storage.updateTabsGroupLabel(id, label);
  }

  public async updateGroupTags(id: string, tags: string[]): Promise<void> {
    const storage = Global.storage;
    this.markDirty(id);
    await storage.updateTabsGroupTags(id, JSON.stringify(tags));
  }

  public async removeTabFromStorage(groupId: string, fsPath: string): Promise<void> {
    const storage = Global.storage;
    this.markDirty(groupId);
    await storage.deleteTabItemByPath(groupId, fsPath);
  }

  public async addTabsToStorage(groupId: string, tabs: TabItem[]): Promise<void> {
    const storage = Global.storage;
    this.markDirty(groupId);

    const existingTabs = storage.getTabItems(groupId);
    let tabSortOrder = existingTabs.length;

    for (const tab of tabs) {
      const tabRow: TabItemRow = {
        id: tab.id!,
        group_id: groupId,
        label: tab.getLabel(),
        file_uri: tab.fileUri.toString(),
        original_uri: tab.originalUri?.toString(),
        tab_type: tab.tabType,
        sort_order: tabSortOrder++,
      };
      await storage.insertTabItem(tabRow);
    }
  }

  public async replaceGroupTabs(groupId: string, newTabs: TabItem[]): Promise<void> {
    const storage = Global.storage;
    this.markDirty(groupId);
    await storage.deleteTabItemsByGroupId(groupId);

    let tabSortOrder = 0;
    for (const tab of newTabs) {
      const tabRow: TabItemRow = {
        id: tab.id!,
        group_id: groupId,
        label: tab.getLabel(),
        file_uri: tab.fileUri.toString(),
        original_uri: tab.originalUri?.toString(),
        tab_type: tab.tabType,
        sort_order: tabSortOrder++,
      };
      await storage.insertTabItem(tabRow);
    }
  }

  public async deleteGroupFromStorage(id: string): Promise<void> {
    const storage = Global.storage;
    this.markDeleted(id);
    await storage.deleteTabsGroup(id);
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
    this.markDirty(group.id);
    for (const tab of group.getTabs()) {
      this.addToReverseIndex(tab.fileUri.fsPath, group.id);
    }
    // Persist immediately
    this.persistChanges();
  }

  public removeTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group) {
      for (const tab of group.getTabs()) {
        this.removeFromReverseIndex(tab.fileUri.fsPath, id);
      }
      this.groups.delete(id);
      this.markDeleted(id);
    }
    // Persist immediately
    this.persistChanges();
  }

  public tryRemoveTabsGroup(id: string) {
    const group = this.groups.get(id);
    if (group && !group.isPinned()) {
      this.removeTabsGroup(id);
      // Persist already called in removeTabsGroup
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

  // --- MUTATION METHODS (with automatic persistence) ---

  public setPinned(id: string, pinned: boolean = true) {
    const g = this.groups.get(id);
    if (g) {
      g.setPin(pinned);
      this.markDirty(id);
      this.persistChanges();
    }
  }

  public setGroupLabel(id: string, label: string) {
    const g = this.groups.get(id);
    if (g) {
      g.setLabel(label);
      this.markDirty(id);
      this.persistChanges();
    }
  }

  public setGroupTags(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.setTags(tags);
      this.markDirty(id);
      this.persistChanges();
    }
  }

  public addTagsToGroup(id: string, tags: string[]) {
    const g = this.groups.get(id);
    if (g) {
      g.extendTags(tags);
      this.markDirty(id);
      this.persistChanges();
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
      this.markDirty(id);
      this.persistChanges();
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
        this.markDirty(id);
        this.persistChanges();
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
        if (group.getTabs().length === 0) {
          this.groups.delete(groupId);
          this.markDeleted(groupId);
        } else {
          this.markDirty(groupId);
        }
        this.persistChanges();
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
          this.markDeleted(group.id);
        } else {
          this.markDirty(gid);
        }
      }
    }
    this.persistChanges();
  }

  // --- BULK OPERATIONS (use persistChanges for efficiency) ---

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
        this.markDirty(src_id);
        if (!srcGroup.isPinned()) {
          // Don't call removeTabsGroup as it will persist immediately
          for (const tab of srcGroup.getTabs()) {
            this.removeFromReverseIndex(tab.fileUri.fsPath, src_id);
          }
          this.groups.delete(src_id);
          this.markDeleted(src_id);
        }
      }
    }

    if (merged_labels.length > 0) {
      dst.removeDuplicateTabs();
      dst.setLabel(dst.label + " (merged with: " + merged_labels.join(", ") + ")");
      this.markDirty(dst_id);
    }

    // Persist all affected groups in one batch
    this.persistChanges();
  }

  public getAllTabsGroupsSorted(): TabsGroup[] {
    // Get the current sorting strategy from configuration
    const config = vscode.workspace.getConfiguration();
    const strategy = (config.get<string>(SORTING_STRATEGY_CONFIG_KEY) ?? DEFAULT_SORTING_STRATEGY) as SortingStrategy;

    const groups = Array.from(this.groups.values());
    return SortingService.sortGroups(groups, strategy);
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