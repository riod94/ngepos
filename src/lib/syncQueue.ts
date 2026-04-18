import { db } from "~/db/db";
import { cacheService } from "./cacheInvalidation";
import {
  ConflictDetector,
  mergeEntity,
  type ConflictStrategy,
  type SyncableEntity,
  type ConflictRecord,
  type MergeResult,
} from "./conflictResolution";
import { autoVersioner, type VersionType } from "./version";

export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";
export type SyncEntityType = "transaction" | "expense" | "product" | "customer" | "loyalty";

export interface QueuedOperation {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: "PENDING" | "IN_PROGRESS" | "FAILED" | "COMPLETED" | "CONFLICT";
  error?: string;
  versionVector?: Record<string, number>;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  currentOperation: string | null;
  progress: number;
  errors: string[];
}

export interface SyncStats {
  totalSynced: number;
  totalFailed: number;
  totalConflicts: number;
  averageSyncTime: number;
  lastSyncDuration: number;
}

export interface SyncQueueConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  debounceMs: number;
  batchSize: number;
  conflictStrategy: ConflictStrategy;
  deviceId: string;
}

const DEFAULT_CONFIG: SyncQueueConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  debounceMs: 3000,
  batchSize: 50,
  conflictStrategy: "last-write-wins",
  deviceId: typeof crypto !== "undefined" ? crypto.randomUUID() : `device-${Date.now()}`,
};

class SyncQueueManager {
  private queue: Map<string, QueuedOperation> = new Map();
  private config: SyncQueueConfig;
  private conflictDetector: ConflictDetector<SyncableEntity>;
  private isProcessing: boolean = false;
  private isOnline: boolean = true;
  private syncStatus: SyncStatus;
  private syncStats: SyncStats;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(config: Partial<SyncQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conflictDetector = new ConflictDetector<SyncableEntity>(
      this.config.deviceId,
      this.config.conflictStrategy
    );
    this.syncStatus = {
      isOnline: true,
      isSyncing: false,
      lastSyncAt: null,
      pendingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      currentOperation: null,
      progress: 0,
      errors: [],
    };
    this.syncStats = {
      totalSynced: 0,
      totalFailed: 0,
      totalConflicts: 0,
      averageSyncTime: 0,
      lastSyncDuration: 0,
    };
    this.initializeNetworkListeners();
    this.loadQueueFromStorage();
  }

  private initializeNetworkListeners(): void {
    if (typeof window === "undefined") return;

    this.onlineListener = () => {
      this.isOnline = true;
      this.syncStatus.isOnline = true;
      this.notifyListeners();
      this.triggerSync();
    };

    this.offlineListener = () => {
      this.isOnline = false;
      this.syncStatus.isOnline = false;
      this.notifyListeners();
    };

    window.addEventListener("online", this.onlineListener);
    window.addEventListener("offline", this.offlineListener);

    this.isOnline = navigator.onLine;
    this.syncStatus.isOnline = navigator.onLine;
  }

  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem("sync_queue");
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedOperation[];
        for (const op of parsed) {
          if (op.status === "PENDING" || op.status === "FAILED") {
            this.queue.set(op.id, op);
          }
        }
      }
      this.updatePendingCount();
    } catch (err) {
      console.error("[SyncQueue] Failed to load queue from storage:", err);
    }
  }

  private async saveQueueToStorage(): Promise<void> {
    try {
      const operations = Array.from(this.queue.values());
      localStorage.setItem("sync_queue", JSON.stringify(operations));
    } catch (err) {
      console.error("[SyncQueue] Failed to save queue to storage:", err);
    }
  }

  private updatePendingCount(): void {
    let pending = 0;
    let failed = 0;
    let conflict = 0;

    for (const op of this.queue.values()) {
      switch (op.status) {
        case "PENDING":
          pending++;
          break;
        case "FAILED":
          failed++;
          break;
        case "CONFLICT":
          conflict++;
          break;
      }
    }

    this.syncStatus.pendingCount = pending;
    this.syncStatus.failedCount = failed;
    this.syncStatus.conflictCount = conflict;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getStatus());
      } catch (err) {
        console.error("[SyncQueue] Listener error:", err);
      }
    }
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getStats(): SyncStats {
    return { ...this.syncStats };
  }

  private generateId(): string {
    return `${this.config.deviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersionVector(existing?: Record<string, number>): Record<string, number> {
    const vector = existing ? { ...existing } : {};
    vector[this.config.deviceId] = (vector[this.config.deviceId] || 0) + 1;
    return vector;
  }

  async enqueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    data: Record<string, unknown>
  ): Promise<string> {
    const id = this.generateId();
    const existingKey = `${entityType}:${entityId}`;

    const existingOp = this.queue.get(existingKey);
    if (existingOp && existingOp.status === "PENDING") {
      if (operation === "DELETE" || operation === "UPDATE") {
        existingOp.operation = operation;
        existingOp.data = data;
        existingOp.timestamp = Date.now();
        existingOp.versionVector = this.incrementVersionVector(existingOp.versionVector);
        this.queue.set(existingKey, existingOp);
      }
      await this.saveQueueToStorage();
      this.updatePendingCount();
      this.notifyListeners();
      this.triggerSync();
      return existingKey;
    }

    const queuedOp: QueuedOperation = {
      id,
      entityType,
      entityId,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: "PENDING",
      versionVector: this.incrementVersionVector(),
    };

    this.queue.set(existingKey, queuedOp);
    await this.saveQueueToStorage();
    this.updatePendingCount();
    this.notifyListeners();
    this.triggerSync();

    return existingKey;
  }

  async enqueueTransaction(txId: string, data: Record<string, unknown>): Promise<string> {
    return this.enqueue("transaction", txId, "CREATE", data);
  }

  async enqueueExpense(expId: string, data: Record<string, unknown>): Promise<string> {
    return this.enqueue("expense", expId, "CREATE", data);
  }

  triggerSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, this.config.debounceMs);
  }

  private calculateDelay(retryCount: number): number {
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) return;

    const pendingOps = Array.from(this.queue.values())
      .filter((op) => op.status === "PENDING" || op.status === "FAILED")
      .sort((a, b) => a.timestamp - b.timestamp);

    if (pendingOps.length === 0) return;

    this.isProcessing = true;
    this.syncStatus.isSyncing = true;
    this.syncStatus.progress = 0;
    this.notifyListeners();

    const totalOps = pendingOps.length;
    const batch = pendingOps.slice(0, this.config.batchSize);
    const startTime = Date.now();
    let processed = 0;

    for (const op of batch) {
      this.syncStatus.currentOperation = `${op.operation} ${op.entityType}:${op.entityId}`;
      this.notifyListeners();

      try {
        await this.processOperation(op);
        processed++;
        this.syncStats.totalSynced++;
        this.syncStatus.progress = Math.round((processed / batch.length) * 100);
        this.notifyListeners();
      } catch (err) {
        console.error(`[SyncQueue] Failed to process operation ${op.id}:`, err);
        this.handleOperationError(op, err as Error);
      }
    }

    this.syncStatus.lastSyncAt = Date.now();
    this.syncStatus.currentOperation = null;
    this.syncStatus.progress = 100;
    this.syncStats.lastSyncDuration = Date.now() - startTime;
    this.syncStats.averageSyncTime =
      (this.syncStats.averageSyncTime * (this.syncStats.totalSynced - batch.length) +
        this.syncStats.lastSyncDuration) /
      this.syncStats.totalSynced;

    await this.saveQueueToStorage();
    this.isProcessing = false;
    this.syncStatus.isSyncing = false;
    this.notifyListeners();

    if (pendingOps.length > batch.length) {
      this.triggerSync();
    }
  }

  private async processOperation(op: QueuedOperation): Promise<void> {
    op.status = "IN_PROGRESS";
    this.queue.set(`${op.entityType}:${op.entityId}`, op);

    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("No auth token available");
    }

    const endpoint = this.getEndpoint(op.entityType);
    let method = "POST";
    let body = op.data;

    if (op.operation === "UPDATE") {
      method = "PUT";
    } else if (op.operation === "DELETE") {
      method = "DELETE";
    }

    const res = await fetch(endpoint, {
      method,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Device-Id": this.config.deviceId,
        "X-Version-Vector": JSON.stringify(op.versionVector || {}),
      },
    });

    if (!res.ok) {
      if (res.status === 409) {
        op.status = "CONFLICT";
        this.syncStats.totalConflicts++;
        const conflict = await this.handleConflict(op, await res.json());
        this.queue.set(`${op.entityType}:${op.entityId}`, conflict);
        throw new Error("Conflict detected");
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error("Authentication failed");
      }

      throw new Error(`Server error: ${res.status}`);
    }

    op.status = "COMPLETED";
    this.queue.delete(`${op.entityType}:${op.entityId}`);

    cacheService.invalidateSync();
  }

  private async handleConflict(
    op: QueuedOperation,
    serverData: Record<string, unknown>
  ): Promise<QueuedOperation> {
    const localEntity = {
      ...op.data,
      id: op.entityId,
      updatedAt: op.timestamp,
      versionVector: op.versionVector,
    } as unknown as SyncableEntity;

    const serverEntity = {
      ...serverData,
      updatedAt: (serverData.updatedAt as number) || Date.now(),
    } as unknown as SyncableEntity;

    const conflict = this.conflictDetector.detectConflict(
      op.entityId,
      op.entityType,
      localEntity,
      serverEntity
    );

    if (!conflict) {
      op.status = "COMPLETED";
      return op;
    }

    if (this.config.conflictStrategy === "manual") {
      op.status = "CONFLICT";
      return op;
    }

    const merged = mergeEntity(
      op.data as Record<string, unknown>,
      serverData,
      this.config.conflictStrategy
    );

    if (!merged.hadConflicts) {
      op.status = "PENDING";
      op.data = merged.merged;
      op.retryCount = 0;
      return op;
    }

    const resolved = this.conflictDetector.resolveConflict(
      op.entityId,
      merged.hadConflicts ? "merged" : "local",
      merged.merged as unknown as SyncableEntity
    );

    if (resolved) {
      op.status = "PENDING";
      op.data = resolved as unknown as Record<string, unknown>;
      op.retryCount = 0;
    } else {
      op.status = "CONFLICT";
    }

    return op;
  }

  private getEndpoint(entityType: SyncEntityType): string {
    switch (entityType) {
      case "transaction":
      case "expense":
        return "/api/sync";
      case "product":
        return "/api/products";
      case "customer":
        return "/api/customers";
      case "loyalty":
        return "/api/loyalty";
      default:
        return "/api/sync";
    }
  }

  private handleOperationError(op: QueuedOperation, error: Error): void {
    op.retryCount++;
    op.error = error.message;

    if (op.retryCount >= this.config.maxRetries) {
      op.status = "FAILED";
      this.syncStats.totalFailed++;
      this.syncStatus.errors.push(
        `Operation ${op.entityType}:${op.entityId} failed after ${op.retryCount} attempts: ${error.message}`
      );
    } else {
      op.status = "PENDING";
      const delay = this.calculateDelay(op.retryCount);
      setTimeout(() => this.triggerSync(), delay);
    }

    this.queue.set(`${op.entityType}:${op.entityId}`, op);
    this.updatePendingCount();
    this.notifyListeners();
  }

  async resolveConflict(
    entityType: SyncEntityType,
    entityId: string,
    resolution: "local" | "server" | "merged",
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    const key = `${entityType}:${entityId}`;
    const op = this.queue.get(key);

    if (!op || op.status !== "CONFLICT") {
      return false;
    }

    const resolved = this.conflictDetector.resolveConflict(entityId, resolution, mergedData as unknown as SyncableEntity);

    if (resolved) {
      op.status = "PENDING";
      op.data = resolved as unknown as Record<string, unknown>;
      op.retryCount = 0;
      this.queue.set(key, op);
      this.updatePendingCount();
      this.notifyListeners();
      this.triggerSync();
      return true;
    }

    return false;
  }

  getPendingConflicts(): ConflictRecord<SyncableEntity>[] {
    return this.conflictDetector.getPendingConflicts();
  }

  async retryFailed(): Promise<void> {
    for (const op of this.queue.values()) {
      if (op.status === "FAILED") {
        op.status = "PENDING";
        op.retryCount = 0;
        op.error = undefined;
        this.queue.set(`${op.entityType}:${op.entityId}`, op);
      }
    }

    this.syncStatus.errors = [];
    await this.saveQueueToStorage();
    this.updatePendingCount();
    this.notifyListeners();
    this.triggerSync();
  }

  async clearCompleted(): Promise<void> {
    for (const [key, op] of this.queue.entries()) {
      if (op.status === "COMPLETED") {
        this.queue.delete(key);
      }
    }
    this.conflictDetector.clearResolvedConflicts();
    await this.saveQueueToStorage();
  }

  async forceSyncNow(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    await this.processQueue();
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineListener!);
      window.removeEventListener("offline", this.offlineListener!);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.listeners.clear();
  }
}

export const syncQueue = new SyncQueueManager();

export async function queueTransaction(txId: string, data: Record<string, unknown>): Promise<string> {
  return syncQueue.enqueueTransaction(txId, data);
}

export async function queueExpense(expId: string, data: Record<string, unknown>): Promise<string> {
  return syncQueue.enqueueExpense(expId, data);
}

export function getSyncStatus(): SyncStatus {
  return syncQueue.getStatus();
}

export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  return syncQueue.onStatusChange(callback);
}

export async function resolveSyncConflict(
  entityType: SyncEntityType,
  entityId: string,
  resolution: "local" | "server" | "merged",
  mergedData?: Record<string, unknown>
): Promise<boolean> {
  return syncQueue.resolveConflict(entityType, entityId, resolution, mergedData);
}
