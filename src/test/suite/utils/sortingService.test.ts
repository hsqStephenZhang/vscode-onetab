// import assert from "assert";
// import { TabsGroup } from "../../../model/tabsgroup";
// import { SortingService } from "../../../utils/sortingService";
// import { AccessTrackingService } from "../../../utils/accessTrackingService";
// import { SortingStrategy } from "../../../constant";
// import { resetTestState } from "../testHelper";

// suite("SortingService", () => {
//   let group1: TabsGroup;
//   let group2: TabsGroup;
//   let group3: TabsGroup;
//   let group4: TabsGroup;

//   setup(() => {
//     resetTestState();
//     AccessTrackingService.initialize();

//     group1 = new TabsGroup("id1", "Group 1");
//     group2 = new TabsGroup("id2", "Group 2");
//     group3 = new TabsGroup("id3", "untitled tabs group 3");
//     group4 = new TabsGroup("id4", "untitled tabs group 4");

//     // Set different creation times
//     group1.createTime = 1000;
//     group2.createTime = 2000;
//     group3.createTime = 3000;
//     group4.createTime = 4000;
//   });

//   test("Default strategy: pinned first, then named, then by creation time", async () => {
//     group1.setPin(true);
//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.DEFAULT);

//     // group1 (pinned) should be first
//     assert.strictEqual(sorted[0], group1);
//     // group2 (named) should be second
//     assert.strictEqual(sorted[1], group2);
//     // group3 and group4 (untitled) by creation time (newest first)
//     assert.strictEqual(sorted[2], group4);
//     assert.strictEqual(sorted[3], group3);
//   });

//   test("Default strategy: with named and tagged groups", async () => {
//     group1.setTags(["tag1"]);
//     group2.setTags(["tag2"]);
//     group3.setPin(true);
    
//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.DEFAULT);

//     // group3 (pinned) should be first
//     assert.strictEqual(sorted[0], group3);
//     // group1 (named with tags) should be second
//     assert.strictEqual(sorted[1], group1);
//   });

//   test("LRU strategy: most recently accessed first", async () => {
//     // Set different access times by recording accesses
//     // group1: 3 accesses
//     for (let i = 0; i < 3; i++) {
//       await AccessTrackingService.recordAccess(group1.id!);
//       // Small delay to ensure different timestamps
//       await new Promise(r => setTimeout(r, 10));
//     }

//     // group2: 2 accesses
//     for (let i = 0; i < 2; i++) {
//       await AccessTrackingService.recordAccess(group2.id!);
//       await new Promise(r => setTimeout(r, 10));
//     }

//     // group3: 1 access
//     await AccessTrackingService.recordAccess(group3.id!);
//     await new Promise(r => setTimeout(r, 10));

//     // group4: no accesses (will use creation time)

//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.LRU);

//     // group1 (most recent access) should be first
//     assert.strictEqual(sorted[0], group1);
//     assert.strictEqual(sorted[1], group2);
//     assert.strictEqual(sorted[2], group3);
//     assert.strictEqual(sorted[3], group4);
//   });

//   test("LRU strategy: pinned groups first", async () => {
//     group3.setPin(true);
//     group4.setPin(true);

//     // Record accesses for unpinned groups
//     await AccessTrackingService.recordAccess(group1.id!);
//     await new Promise(r => setTimeout(r, 10));
//     await AccessTrackingService.recordAccess(group2.id!);

//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.LRU);

//     // Both pinned groups should be first
//     assert(sorted[0].isPinned());
//     assert(sorted[1].isPinned());
//     // Unpinned groups follow
//     assert(!sorted[2].isPinned());
//     assert(!sorted[3].isPinned());
//   });

//   test("LFU strategy: most frequently used first", async () => {
//     // group1: 5 accesses
//     for (let i = 0; i < 5; i++) {
//       await AccessTrackingService.recordAccess(group1.id!);
//     }

//     // group2: 3 accesses
//     for (let i = 0; i < 3; i++) {
//       await AccessTrackingService.recordAccess(group2.id!);
//     }

//     // group3: 1 access
//     await AccessTrackingService.recordAccess(group3.id!);

//     // group4: no accesses

//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.LFU);

//     // group1 (5 accesses) should be first
//     assert.strictEqual(sorted[0], group1);
//     // group2 (3 accesses) should be second
//     assert.strictEqual(sorted[1], group2);
//     // group3 (1 access) should be third
//     assert.strictEqual(sorted[2], group3);
//     // group4 (0 accesses) should be last
//     assert.strictEqual(sorted[3], group4);
//   });

//   test("LFU strategy: pinned groups first, then by frequency", async () => {
//     group4.setPin(true);
//     group1.setPin(true);

//     // Record accesses
//     for (let i = 0; i < 5; i++) {
//       await AccessTrackingService.recordAccess(group4.id!);
//     }
//     for (let i = 0; i < 10; i++) {
//       await AccessTrackingService.recordAccess(group1.id!);
//     }
//     for (let i = 0; i < 3; i++) {
//       await AccessTrackingService.recordAccess(group2.id!);
//     }

//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.LFU);

//     // Both pinned groups should be first, sorted by frequency
//     assert.strictEqual(sorted[0], group1); // pinned, 10 accesses
//     assert.strictEqual(sorted[1], group4); // pinned, 5 accesses
//     // Unpinned groups follow
//     assert.strictEqual(sorted[2], group2); // unpinned, 3 accesses
//     assert.strictEqual(sorted[3], group3); // unpinned, 0 accesses
//   });

//   test("LFU strategy: break ties with creation time", async () => {
//     // group1 and group2 both have 3 accesses
//     for (let i = 0; i < 3; i++) {
//       await AccessTrackingService.recordAccess(group1.id!);
//       await AccessTrackingService.recordAccess(group2.id!);
//     }

//     const groups = [group4, group2, group3, group1];
//     const sorted = SortingService.sortGroups(groups, SortingStrategy.LFU);

//     // group1 and group2 have same access count, so should be sorted by creation time
//     // group2 (created at 2000) is newer than group1 (created at 1000)
//     assert.strictEqual(sorted[0], group2);
//     assert.strictEqual(sorted[1], group1);
//   });

//   test("Sorting with no access tracking data", async () => {
//     // All groups have no access tracking data
//     const groups = [group4, group2, group3, group1];

//     // LRU with no tracking falls back to creation time
//     const sortedLRU = SortingService.sortGroups(groups, SortingStrategy.LRU);
//     assert.strictEqual(sortedLRU[0], group4); // newest creation time
//     assert.strictEqual(sortedLRU[3], group1); // oldest creation time

//     // LFU with no tracking falls back to creation time
//     const sortedLFU = SortingService.sortGroups(groups, SortingStrategy.LFU);
//     assert.strictEqual(sortedLFU[0], group4);
//     assert.strictEqual(sortedLFU[3], group1);
//   });

//   test("Mixed pinned and unpinned with different strategies", async () => {
//     group1.setPin(true);
//     group3.setPin(true);

//     // Record various access patterns
//     for (let i = 0; i < 10; i++) {
//       await AccessTrackingService.recordAccess(group2.id!);
//     }
//     for (let i = 0; i < 5; i++) {
//       await AccessTrackingService.recordAccess(group4.id!);
//     }

//     const groups = [group4, group2, group3, group1];

//     // LFU should prioritize pinned, then by frequency
//     const sortedLFU = SortingService.sortGroups(groups, SortingStrategy.LFU);
//     assert(sortedLFU[0].isPinned());
//     assert(sortedLFU[1].isPinned());
//     assert(!sortedLFU[2].isPinned());
//     assert(!sortedLFU[3].isPinned());

//     // group2 (10 accesses) should come before group4 (5 accesses) in unpinned
//     const unpinnedInLFU = sortedLFU.filter(g => !g.isPinned());
//     assert.strictEqual(unpinnedInLFU[0], group2);
//     assert.strictEqual(unpinnedInLFU[1], group4);
//   });
// });