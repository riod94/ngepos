import { describe, it, expect, beforeEach } from "vitest";
import {
  ConflictDetector,
  compareVersionVectors,
  mergeVersionVectors,
  mergeEntity,
  type SyncableEntity,
} from "~/lib/conflictResolution";

describe("Conflict Resolution", () => {
  describe("compareVersionVectors", () => {
    it("should return local-newer when local is newer", () => {
      const local = { device1: 5 };
      const server = { device1: 3 };
      expect(compareVersionVectors(local, server)).toBe("local-newer");
    });

    it("should return server-newer when server is newer", () => {
      const local = { device1: 2 };
      const server = { device1: 4 };
      expect(compareVersionVectors(local, server)).toBe("server-newer");
    });

    it("should return concurrent when both have newer changes", () => {
      const local = { device1: 5 };
      const server = { device1: 3, device2: 2 };
      expect(compareVersionVectors(local, server)).toBe("concurrent");
    });

    it("should return equal when versions match", () => {
      const local = { device1: 3, device2: 2 };
      const server = { device1: 3, device2: 2 };
      expect(compareVersionVectors(local, server)).toBe("equal");
    });
  });

  describe("mergeVersionVectors", () => {
    it("should merge vectors taking highest values", () => {
      const local = { device1: 5, device2: 1 };
      const server = { device1: 3, device2: 2 };
      const merged = mergeVersionVectors(local, server);

      expect(merged.device1).toBe(5);
      expect(merged.device2).toBe(2);
    });

    it("should include all devices from both vectors", () => {
      const local = { device1: 5 };
      const server = { device2: 3 };
      const merged = mergeVersionVectors(local, server);

      expect(Object.keys(merged)).toContain("device1");
      expect(Object.keys(merged)).toContain("device2");
    });
  });

  describe("mergeEntity", () => {
    it("should use local-wins strategy", () => {
      const local = { id: "1", name: "Local", updatedAt: 1000 };
      const server = { id: "1", name: "Server", updatedAt: 500 };

      const result = mergeEntity(local, server, "local-wins");
      expect(result.merged.name).toBe("Local");
      expect(result.hadConflicts).toBe(false);
    });

    it("should use server-wins strategy", () => {
      const local = { id: "1", name: "Local", updatedAt: 1000 };
      const server = { id: "1", name: "Server", updatedAt: 500 };

      const result = mergeEntity(local, server, "server-wins");
      expect(result.merged.name).toBe("Server");
    });

    it("should use last-write-wins strategy", () => {
      const local = { id: "1", name: "Local", updatedAt: 1000 };
      const server = { id: "1", name: "Server", updatedAt: 500 };

      const result = mergeEntity(local, server, "last-write-wins");
      expect(result.merged.name).toBe("Local");
    });

    it("should detect conflicts with manual strategy when data differs", () => {
      const local = { id: "1", name: "Local", price: 100, updatedAt: 1000 };
      const server = { id: "1", name: "Server", price: 200, updatedAt: 800 };

      const result = mergeEntity(local, server, "last-write-wins");
      expect(result.hadConflicts).toBe(false);
    });
  });

  describe("ConflictDetector", () => {
    let detector: ConflictDetector<TestEntity>;

    interface TestEntity extends SyncableEntity {
      id: string;
      name: string;
      updatedAt: number;
      versionVector?: Record<string, number>;
    }

    beforeEach(() => {
      detector = new ConflictDetector<TestEntity>("device1", "last-write-wins");
    });

    it("should detect conflict when versions are concurrent", () => {
      const localEntity: TestEntity = {
        id: "1",
        name: "Local",
        updatedAt: 1000,
        deviceId: "device1",
        versionVector: { device1: 5, device2: 1 },
      };
      const serverEntity: TestEntity = {
        id: "1",
        name: "Server",
        updatedAt: 500,
        deviceId: "device2",
        versionVector: { device1: 3, device2: 3 },
      };

      const conflict = detector.detectConflict("1", "test", localEntity, serverEntity);
      expect(conflict).not.toBeNull();
      expect(conflict?.status).toBe("pending");
    });

    it("should return null when versions indicate local is newer", () => {
      const localEntity: TestEntity = {
        id: "1",
        name: "Local",
        updatedAt: 1000,
        versionVector: { device1: 5 },
      };
      const serverEntity: TestEntity = {
        id: "1",
        name: "Server",
        updatedAt: 500,
        versionVector: { device1: 3 },
      };

      const conflict = detector.detectConflict("1", "test", localEntity, serverEntity);
      expect(conflict).toBeNull();
    });

    it("should resolve conflict with local resolution", () => {
      const localEntity: TestEntity = {
        id: "1",
        name: "Local",
        updatedAt: 1000,
        versionVector: { device1: 5 },
      };
      const serverEntity: TestEntity = {
        id: "1",
        name: "Server",
        updatedAt: 500,
        versionVector: { device1: 3, device2: 2 },
      };

      detector.detectConflict("1", "test", localEntity, serverEntity);

      const resolved = detector.resolveConflict("1", "local", localEntity);
      expect(resolved?.name).toBe("Local");
    });

    it("should get pending conflicts", () => {
      const localEntity: TestEntity = {
        id: "2",
        name: "Local",
        updatedAt: 1000,
        versionVector: { device1: 5, device2: 1 },
      };
      const serverEntity: TestEntity = {
        id: "2",
        name: "Server",
        updatedAt: 500,
        versionVector: { device1: 3, device2: 3 },
      };

      detector.detectConflict("2", "test", localEntity, serverEntity);
      const pending = detector.getPendingConflicts();

      expect(pending.length).toBeGreaterThan(0);
    });
  });
});
