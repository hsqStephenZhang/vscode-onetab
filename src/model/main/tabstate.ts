// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { TabItem } from "./tabitem";
import { TabsGroup } from "./tabsgroup";

export class TabsState {
  public groups: TabsGroup[] = [];

  // getters

  public getPinnedLists(): TabsGroup[] {
    return this.groups.filter((list) => list.pinned);
  }

  public getTitledLists(): TabsGroup[] {
    return this.groups.filter((list) => list.title !== "");
  }

  public getTaggedLists(): TabsGroup[] {
    return this.groups.filter((list) => list.tags.length !== 0);
  }

  public filter(filters: ((list: TabsGroup) => boolean)[]): TabsGroup[] {
    return this.groups.filter((list) => filters.every((f) => f(list)));
  }

  // setters

  public setPinned(index: number, pinned: boolean = true) {
    this.groups[index].pinned = pinned;
  }

  public setTitleToGroup(index: number, title: string) {
    this.groups[index].title = title;
  }

  public setTagsToGroup(index: number, tags: string[]) {
    this.groups[index].tags = tags;
  }

  public addTagsToGroup(index: number, tags: string[]) {
    this.groups[index].tags = this.groups[index].tags.concat(tags);
  }

  public setTabsOfGroup(index: number, tabs: TabItem[]) {
    this.groups[index].tabs = tabs;
  }

  public addTabsToGroup(index: number, tabs: TabItem[]) {
    this.groups[index].tabs = this.groups[index].tabs.concat(tabs);
  }

  public addTabsGroup(group: TabsGroup) {
    this.groups.push(group);
  }
}
