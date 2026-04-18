import { describe, it, expect, beforeEach } from "vitest";
import { cacheService } from "~/lib/cacheInvalidation";

describe("Cache Invalidation Service", () => {
  beforeEach(() => {
    cacheService.invalidateAll();
  });

  describe("Basic Cache Operations", () => {
    it("should store and retrieve cache entries", () => {
      cacheService.set("products:p1", { id: "p1", name: "Coffee" });
      const result = cacheService.get("products:p1");
      expect(result).toEqual({ id: "p1", name: "Coffee" });
    });

    it("should return null for non-existent keys", () => {
      const result = cacheService.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should invalidate specific keys", () => {
      cacheService.set("products:p1", { id: "p1" });
      cacheService.set("products:p2", { id: "p2" });
      cacheService.invalidate("products:p1");

      expect(cacheService.get("products:p1")).toBeNull();
      expect(cacheService.get("products:p2")).toEqual({ id: "p2" });
    });

    it("should invalidate all entries", () => {
      cacheService.set("products:p1", { id: "p1" });
      cacheService.set("customers:c1", { id: "c1" });
      cacheService.invalidateAll();

      expect(cacheService.get("products:p1")).toBeNull();
      expect(cacheService.get("customers:c1")).toBeNull();
    });

    it("should check if entry is expired", () => {
      cacheService.set("test:short", { data: "test" }, 100);
      expect(cacheService.isExpired("test:short")).toBe(false);

      cacheService.set("test:expired", { data: "test" }, -1000);
      expect(cacheService.isExpired("test:expired")).toBe(true);
    });
  });

  describe("Pattern-based Invalidation", () => {
    it("should invalidate by entity type pattern", () => {
      cacheService.set("products:p1", { id: "p1" });
      cacheService.set("products:p2", { id: "p2" });
      cacheService.set("customers:c1", { id: "c1" });

      cacheService.invalidateEntity("products");

      expect(cacheService.get("products:p1")).toBeNull();
      expect(cacheService.get("products:p2")).toBeNull();
      expect(cacheService.get("customers:c1")).toEqual({ id: "c1" });
    });

    it("should invalidate by regex pattern", () => {
      cacheService.set("products:p1", { id: "p1" });
      cacheService.set("products:p2", { id: "p2" });
      cacheService.set("sync:pending", { id: "pending" });

      cacheService.invalidatePattern("^products:");

      expect(cacheService.get("products:p1")).toBeNull();
      expect(cacheService.get("products:p2")).toBeNull();
      expect(cacheService.get("sync:pending")).toEqual({ id: "pending" });
    });
  });

  describe("TTL Configuration", () => {
    it("should use correct TTL for products", () => {
      const ttl = cacheService.getTTL("products");
      expect(ttl).toBe(10 * 60 * 1000);
    });

    it("should use correct TTL for categories", () => {
      const ttl = cacheService.getTTL("categories");
      expect(ttl).toBe(30 * 60 * 1000);
    });

    it("should use default TTL for unknown entity types", () => {
      const ttl = cacheService.getTTL("unknown" as any);
      expect(ttl).toBe(5 * 60 * 1000);
    });
  });

  describe("Cache Statistics", () => {
    it("should return correct stats", () => {
      cacheService.set("products:p1", { id: "p1" });
      cacheService.set("customers:c1", { id: "c1" });

      const stats = cacheService.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.entries["products:p1"]).toBeDefined();
      expect(stats.entries["customers:c1"]).toBeDefined();
    });
  });
});
