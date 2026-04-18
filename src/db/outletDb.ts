import Dexie, { type EntityTable } from "dexie";

export interface Outlet {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  isHeadquarters: boolean;
  settings?: {
    currency?: string;
    timezone?: string;
    taxRate?: number;
    receiptFooter?: string;
    operatingHours?: { open: string; close: string };
  };
  createdAt: number;
  updatedAt: number;
}

export interface UserOutlet {
  id: string;
  userId: string;
  outletId: string;
  role: "OWNER" | "MANAGER" | "CASHIER";
  isDefault: boolean;
  createdAt: number;
}

export interface OutletSyncQueue {
  id: string;
  outletId: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  data?: any;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  retryCount: number;
  errorMessage?: string;
  processedAt?: number;
  createdAt: number;
}

export interface OutletDB extends Dexie {
  outlets: EntityTable<Outlet, "id">;
  userOutlets: EntityTable<UserOutlet, "id">;
  outletSyncQueue: EntityTable<OutletSyncQueue, "id">;
}

export const outletDB = new Dexie("ngepos_outlets") as OutletDB;

outletDB.version(1).stores({
  outlets: "id, code, isActive",
  userOutlets: "id, userId, outletId",
  outletSyncQueue: "id, outletId, entityType, entityId, status, priority",
});

export async function getActiveOutlets(): Promise<Outlet[]> {
  return outletDB.outlets.where("isActive").equals(1).toArray();
}

export async function getOutletByCode(code: string): Promise<Outlet | undefined> {
  return outletDB.outlets.where("code").equals(code).first();
}

export async function getUserOutlets(userId: string): Promise<UserOutlet[]> {
  return outletDB.userOutlets.where("userId").equals(userId).toArray();
}

export async function getDefaultOutlet(userId: string): Promise<Outlet | undefined> {
  const userOutlet = await outletDB.userOutlets
    .where("userId")
    .equals(userId)
    .filter((uo) => uo.isDefault)
    .first();

  if (!userOutlet) return undefined;

  return outletDB.outlets.get(userOutlet.outletId);
}

export async function switchOutlet(outletId: string): Promise<void> {
  localStorage.setItem("current_outlet_id", outletId);
}

export async function getCurrentOutletId(): Promise<string | null> {
  return localStorage.getItem("current_outlet_id");
}

export async function addOutletToQueue(
  entry: Omit<OutletSyncQueue, "id" | "createdAt" | "retryCount" | "status">
): Promise<string> {
  const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await outletDB.outletSyncQueue.add({
    ...entry,
    id,
    status: "PENDING",
    retryCount: 0,
    createdAt: Date.now(),
  });

  return id;
}

export async function getPendingSyncItems(limit = 50): Promise<OutletSyncQueue[]> {
  return outletDB.outletSyncQueue
    .where("status")
    .equals("PENDING")
    .limit(limit)
    .toArray();
}

export async function markSyncItemProcessing(id: string): Promise<void> {
  await outletDB.outletSyncQueue.update(id, { status: "PROCESSING" });
}

export async function markSyncItemCompleted(id: string): Promise<void> {
  await outletDB.outletSyncQueue.update(id, {
    status: "COMPLETED",
    processedAt: Date.now(),
  });
}

export async function markSyncItemFailed(id: string, error: string): Promise<void> {
  const item = await outletDB.outletSyncQueue.get(id);
  if (!item) return;

  if (item.retryCount >= 3) {
    await outletDB.outletSyncQueue.update(id, {
      status: "FAILED",
      errorMessage: error,
    });
  } else {
    await outletDB.outletSyncQueue.update(id, {
      status: "PENDING",
      retryCount: item.retryCount + 1,
      errorMessage: error,
    });
  }
}

export async function cleanupCompletedSyncItems(keepDays = 7): Promise<void> {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

  await outletDB.outletSyncQueue
    .where("status")
    .equals("COMPLETED")
    .filter((item) => (item.processedAt || 0) < cutoff)
    .delete();
}

export async function getOutletStats(): Promise<{
  totalOutlets: number;
  activeOutlets: number;
  pendingSync: number;
  failedSync: number;
}> {
  const totalOutlets = await outletDB.outlets.count();
  const activeOutlets = await outletDB.outlets.where("isActive").equals(1).count();
  const pendingSync = await outletDB.outletSyncQueue.where("status").equals("PENDING").count();
  const failedSync = await outletDB.outletSyncQueue.where("status").equals("FAILED").count();

  return { totalOutlets, activeOutlets, pendingSync, failedSync };
}
