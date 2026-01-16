import { TabsGroup } from "../model/tabsgroup";
import { SortingStrategy } from "../constant";
import { AccessTrackingService } from "./accessTrackingService";

export class SortingService {
  /**
   * Sort tab groups based on the specified strategy
   */
  public static sortGroups(groups: TabsGroup[], strategy: SortingStrategy): TabsGroup[] {
    switch (strategy) {
      case SortingStrategy.LRU:
        return this.sortByLRU(groups);
      case SortingStrategy.LFU:
        return this.sortByLFU(groups);
      case SortingStrategy.DEFAULT:
      default:
        return this.sortByDefault(groups);
    }
  }

  /**
   * Default sorting strategy:
   * 1. Pinned groups first
   * 2. Named (titled) groups second
   * 3. Tagged groups third
   * 4. By creation time (newest first)
   */
  private static sortByDefault(groups: TabsGroup[]): TabsGroup[] {
    const pinnedIds = new Set<string>();
    const namedIds = new Set<string>();
    const taggedIds = new Set<string>();

    for (const group of groups) {
      if (!group.id) continue;
      if (group.isPinned()) pinnedIds.add(group.id);
      if (!group.isUntitled()) namedIds.add(group.id);
      if (group.getTags().length > 0) taggedIds.add(group.id);
    }

    return groups
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

  /**
   * LRU (Least Recently Used) sorting strategy:
   * 1. Pinned groups first (sorted by access time)
   * 2. Non-pinned groups by most recent access time
   */
  private static sortByLRU(groups: TabsGroup[]): TabsGroup[] {
    const pinned: TabsGroup[] = [];
    const unpinned: TabsGroup[] = [];

    for (const group of groups) {
      if (group.isPinned()) {
        pinned.push(group);
      } else {
        unpinned.push(group);
      }
    }

    // Sort pinned by last access time (most recent first)
    pinned.sort((a, b) => {
      const aTime = a.id ? AccessTrackingService.getLastAccessTime(a.id) : a.createTime;
      const bTime = b.id ? AccessTrackingService.getLastAccessTime(b.id) : b.createTime;
      return bTime - aTime;
    });

    // Sort unpinned by last access time (most recent first)
    unpinned.sort((a, b) => {
      const aTime = a.id ? AccessTrackingService.getLastAccessTime(a.id) : a.createTime;
      const bTime = b.id ? AccessTrackingService.getLastAccessTime(b.id) : b.createTime;
      return bTime - aTime;
    });

    return [...pinned, ...unpinned];
  }

  /**
   * LFU (Least Frequently Used) sorting strategy:
   * 1. Pinned groups first (sorted by access count)
   * 2. Non-pinned groups by frequency of access (most frequent first)
   * 3. Break ties by creation time
   */
  private static sortByLFU(groups: TabsGroup[]): TabsGroup[] {
    const pinned: TabsGroup[] = [];
    const unpinned: TabsGroup[] = [];

    for (const group of groups) {
      if (group.isPinned()) {
        pinned.push(group);
      } else {
        unpinned.push(group);
      }
    }

    // Sort pinned by access count (highest first), then by creation time
    pinned.sort((a, b) => {
      const aCount = a.id ? AccessTrackingService.getAccessCount(a.id) : 0;
      const bCount = b.id ? AccessTrackingService.getAccessCount(b.id) : 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return b.createTime - a.createTime;
    });

    // Sort unpinned by access count (highest first), then by creation time
    unpinned.sort((a, b) => {
      const aCount = a.id ? AccessTrackingService.getAccessCount(a.id) : 0;
      const bCount = b.id ? AccessTrackingService.getAccessCount(b.id) : 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return b.createTime - a.createTime;
    });

    return [...pinned, ...unpinned];
  }
}