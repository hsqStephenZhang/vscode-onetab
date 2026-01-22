// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export const DEFAULT_BRANCH_NAME = "none";
export const BRANCHES_KEY = "branches";
export const STORAGE_KEY = "tabsState";
export const DEFAULT_TAB_GROUP_LABEL = "untitled tabs group";
export const DEFAULT_TAB_GROUP_LABEL_INDEX = 0;
export const DEFAULT_TAB_LABEL = "untitled tab";
export const CONTEXT_TAB_GROUP = "tabsGroup";
export const CONTEXT_TAB = "tab";
export const CONTEXT_BRANCH = "branch";

// Sorting strategy constants
export enum SortingStrategy {
  DEFAULT = "default",
  LRU = "lru", // Least Recently Used
  LFU = "lfu", // Least Frequently Used
}

export const SORTING_STRATEGY_CONFIG_KEY = "onetab.sortingStrategy";
export const DEFAULT_SORTING_STRATEGY = SortingStrategy.DEFAULT;
