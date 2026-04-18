export type ConflictStrategy = "local-wins" | "server-wins" | "manual" | "last-write-wins";

export interface SyncableEntity {
  id: string;
  updatedAt: number;
  deviceId?: string;
  version?: number;
}

export interface ConflictRecord<T extends SyncableEntity> {
  id: string;
  entityType: string;
  localVersion: T;
  serverVersion: T;
  detectedAt: number;
  status: "pending" | "resolved" | "merged";
  resolution?: "local" | "server" | "merged";
}

export interface VersionVector {
  [deviceId: string]: number;
}

export interface ConflictMetadata {
  entityId: string;
  entityType: string;
  localVector: VersionVector;
  serverVector: VersionVector;
  localTimestamp: number;
  serverTimestamp: number;
}

export function compareVersionVectors(
  local: VersionVector,
  server: VersionVector
): "local-newer" | "server-newer" | "concurrent" | "equal" {
  const allDevices = new Set([...Object.keys(local), ...Object.keys(server)]);

  let localNewer = false;
  let serverNewer = false;

  for (const device of allDevices) {
    const localVersion = local[device] || 0;
    const serverVersion = server[device] || 0;

    if (localVersion > serverVersion) {
      localNewer = true;
    } else if (serverVersion > localVersion) {
      serverNewer = true;
    }
  }

  if (localNewer && !serverNewer) return "local-newer";
  if (serverNewer && !localNewer) return "server-newer";
  if (localNewer && serverNewer) return "concurrent";
  return "equal";
}

export function mergeVersionVectors(
  local: VersionVector,
  server: VersionVector
): VersionVector {
  const merged: VersionVector = { ...server };

  for (const [device, version] of Object.entries(local)) {
    if (!merged[device] || merged[device] < version) {
      merged[device] = version;
    }
  }

  return merged;
}

export function incrementVersion(
  vector: VersionVector,
  deviceId: string
): VersionVector {
  return {
    ...vector,
    [deviceId]: (vector[deviceId] || 0) + 1,
  };
}

export interface MergeResult<T> {
  merged: T;
  hadConflicts: boolean;
  conflicts: string[];
}

export function mergeEntity<T extends Record<string, unknown>>(
  local: T,
  server: T,
  strategy: ConflictStrategy
): MergeResult<T> {
  const conflicts: string[] = [];
  let hadConflicts = false;

  if (strategy === "local-wins") {
    return { merged: local, hadConflicts: false, conflicts: [] };
  }

  if (strategy === "server-wins") {
    return { merged: server, hadConflicts: false, conflicts: [] };
  }

  if (strategy === "last-write-wins") {
    const winner = (local.updatedAt as number) > (server.updatedAt as number) ? local : server;
    return { merged: winner, hadConflicts: false, conflicts: [] };
  }

  const merged: Record<string, unknown> = { ...server };

  for (const key of Object.keys(local)) {
    const localValue = local[key];
    const serverValue = server[key];

    if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
      hadConflicts = true;
      conflicts.push(key);

      if (typeof localValue === "object" && typeof serverValue === "object") {
        merged[key] = localValue;
      } else {
        merged[key] = (local.updatedAt as number) > (server.updatedAt as number) ? localValue : serverValue;
      }
    } else {
      merged[key] = localValue;
    }
  }

  return { merged: merged as T, hadConflicts, conflicts };
}

export class ConflictDetector<T extends SyncableEntity> {
  private conflicts: Map<string, ConflictRecord<T>> = new Map();

  constructor(
    private deviceId: string,
    private strategy: ConflictStrategy = "last-write-wins"
  ) {}

  detectConflict(
    entityId: string,
    entityType: string,
    localEntity: T,
    serverEntity: T
  ): ConflictRecord<T> | null {
    const comparison = compareVersionVectors(
      (localEntity as any).versionVector || { [this.deviceId]: localEntity.updatedAt },
      (serverEntity as any).versionVector || { server: serverEntity.updatedAt }
    );

    if (comparison === "concurrent") {
      const conflict: ConflictRecord<T> = {
        id: entityId,
        entityType,
        localVersion: localEntity,
        serverVersion: serverEntity,
        detectedAt: Date.now(),
        status: "pending",
      };

      this.conflicts.set(entityId, conflict);
      return conflict;
    }

    return null;
  }

  resolveConflict(
    entityId: string,
    resolution: "local" | "server" | "merged",
    mergedData?: T
  ): T | null {
    const conflict = this.conflicts.get(entityId);
    if (!conflict) return null;

    conflict.status = "resolved";
    conflict.resolution = resolution;

    switch (resolution) {
      case "local":
        return conflict.localVersion;
      case "server":
        return conflict.serverVersion;
      case "merged":
        return mergedData || conflict.localVersion;
    }
  }

  getPendingConflicts(): ConflictRecord<T>[] {
    return Array.from(this.conflicts.values()).filter(c => c.status === "pending");
  }

  clearResolvedConflicts(): void {
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.status === "resolved") {
        this.conflicts.delete(id);
      }
    }
  }
}

export interface SyncPayload<T> {
  entityId: string;
  entityType: string;
  data: T;
  versionVector: VersionVector;
  timestamp: number;
  deviceId: string;
}

export function createSyncPayload<T extends SyncableEntity>(
  entityId: string,
  entityType: string,
  data: T,
  versionVector: VersionVector
): SyncPayload<T> {
  return {
    entityId,
    entityType,
    data,
    versionVector: incrementVersion(versionVector, data.deviceId || "unknown"),
    timestamp: Date.now(),
    deviceId: data.deviceId || "unknown",
  };
}

export function shouldPushToServer(
  localEntity: SyncableEntity,
  serverEntity: SyncableEntity | null,
  versionVector: VersionVector
): boolean {
  if (!serverEntity) return true;

  const comparison = compareVersionVectors(
    versionVector,
    (serverEntity as any).versionVector || {}
  );

  return comparison === "local-newer" || comparison === "concurrent";
}

export function shouldPullFromServer(
  localEntity: SyncableEntity | null,
  serverEntity: SyncableEntity,
  serverVersionVector: VersionVector
): boolean {
  if (!localEntity) return true;

  const comparison = compareVersionVectors(
    (localEntity as any).versionVector || {},
    serverVersionVector
  );

  return comparison === "server-newer" || comparison === "concurrent";
}
