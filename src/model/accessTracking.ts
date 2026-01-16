// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/**
 * Separate model for tracking access patterns of tab groups
 * This is stored independently from the main TabsGroup data
 */
export class AccessTracking {
  public groupId: string;
  public lastAccessTime: number;
  public accessCount: number;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.lastAccessTime = Date.now();
    this.accessCount = 0;
  }

  public recordAccess(): void {
    this.lastAccessTime = Date.now();
    this.accessCount++;
  }

  public getLastAccessTime(): number {
    return this.lastAccessTime;
  }

  public getAccessCount(): number {
    return this.accessCount;
  }

  /**
   * Serialize to JSON string for storage
   */
  public toJSON(): string {
    return JSON.stringify({
      groupId: this.groupId,
      lastAccessTime: this.lastAccessTime,
      accessCount: this.accessCount,
    });
  }

  /**
   * Deserialize from JSON string
   */
  public static fromJSON(jsonStr: string): AccessTracking {
    const data = JSON.parse(jsonStr);
    const tracking = new AccessTracking(data.groupId);
    tracking.lastAccessTime = data.lastAccessTime ?? Date.now();
    tracking.accessCount = data.accessCount ?? 0;
    return tracking;
  }
}