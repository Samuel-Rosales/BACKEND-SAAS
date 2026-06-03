const CACHE_TTL_MS = 60 * 1000;

type CacheEntry = {
  permissions: string[];
  expiresAt: number;
};

class PermissionCache {
  private cache = new Map<string, CacheEntry>();

  get(roleCode: string): string[] | null {
    const entry = this.cache.get(roleCode);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(roleCode);
      return null;
    }

    return [...entry.permissions];
  }

  set(roleCode: string, permissions: string[]): void {
    this.cache.set(roleCode, {
      permissions: [...permissions],
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  invalidate(roleCode: string): void {
    this.cache.delete(roleCode);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

export const permissionCache = new PermissionCache();
