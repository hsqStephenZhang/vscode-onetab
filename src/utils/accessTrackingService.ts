import { AccessTracking } from "../model/accessTracking";
import { Global } from "../global";

/**
 * Service for managing access tracking across the application
 */
export class AccessTrackingService {
  private static trackingCache: Map<string, AccessTracking> = new Map();

  /**
   * Initialize cache from storage
   */
  public static initialize(): void {
    const storage = Global.storage;
    this.trackingCache = storage.getAllAccessTracking();
  }

  /**
   * Record an access event for a group
   */
  public static async recordAccess(groupId: string): Promise<void> {
    let tracking = this.trackingCache.get(groupId);
    if (!tracking) {
      tracking = new AccessTracking(groupId);
      this.trackingCache.set(groupId, tracking);
    }
    tracking.recordAccess();
    await Global.storage.setAccessTracking(tracking);
  }

  /**
   * Get access tracking data for a group
   */
  public static getTracking(groupId: string): AccessTracking | undefined {
    return this.trackingCache.get(groupId);
  }

  /**
   * Get last access time for a group
   */
  public static getLastAccessTime(groupId: string): number {
    const tracking = this.trackingCache.get(groupId);
    return tracking?.getLastAccessTime() ?? Date.now();
  }

  /**
   * Get access count for a group
   */
  public static getAccessCount(groupId: string): number {
    const tracking = this.trackingCache.get(groupId);
    return tracking?.getAccessCount() ?? 0;
  }

  /**
   * Cleanup tracking data for deleted groups
   */
  public static async deleteTracking(groupId: string): Promise<void> {
    this.trackingCache.delete(groupId);
    await Global.storage.deleteAccessTracking(groupId);
  }

  /**
   * Get all tracking data
   */
  public static getAllTracking(): Map<string, AccessTracking> {
    return new Map(this.trackingCache);
  }
}