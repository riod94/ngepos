import Dexie, { type EntityTable } from "dexie";
import {
  encryptObject,
  decryptObject,
  SENSITIVE_FIELDS_TRANSACTION,
  SENSITIVE_FIELDS_STAFF,
  SENSITIVE_FIELDS_CUSTOMER,
} from "~/lib/encryption";

export interface EncryptedTransaction {
  id: string;
  encryptedData: string;
  lastModified: number;
  deviceId: string;
}

export interface EncryptedStaff {
  id: string;
  encryptedData: string;
  lastModified: number;
}

export interface EncryptedCustomer {
  id: string;
  encryptedData: string;
  lastModified: number;
}

class SecureDexieDatabase extends Dexie {
  secureTransactions!: EntityTable<EncryptedTransaction, "id">;
  secureStaff!: EntityTable<EncryptedStaff, "id">;
  secureCustomers!: EntityTable<EncryptedCustomer, "id">;

  constructor() {
    super("SecureNgeposDB");

    this.version(1).stores({
      secureTransactions: "id, lastModified, deviceId",
      secureStaff: "id, lastModified",
      secureCustomers: "id, lastModified",
    });
  }

  private getDeviceId(): string {
    if (typeof window === "undefined") return "server";

    let deviceId = localStorage.getItem("ngepos_device_id");
    if (!deviceId) {
      deviceId = `device_${crypto.randomUUID()}`;
      localStorage.setItem("ngepos_device_id", deviceId);
    }
    return deviceId;
  }

  async saveSecureTransaction<T extends Record<string, any>>(
    id: string,
    data: T,
    fieldsToEncrypt: string[] = SENSITIVE_FIELDS_TRANSACTION as unknown as string[]
  ): Promise<void> {
    const encrypted = encryptObject(data, fieldsToEncrypt as any);

    await this.secureTransactions.put({
      id,
      encryptedData: JSON.stringify(encrypted),
      lastModified: Date.now(),
      deviceId: this.getDeviceId(),
    });
  }

  async getSecureTransaction<T>(
    id: string,
    fieldsToDecrypt: string[] = SENSITIVE_FIELDS_TRANSACTION as unknown as string[]
  ): Promise<T | undefined> {
    const record = await this.secureTransactions.get(id);
    if (!record) return undefined;

    const decrypted = JSON.parse(record.encryptedData);
    return decryptObject(decrypted, fieldsToDecrypt as any) as T;
  }

  async saveSecureStaff<T extends Record<string, any>>(
    id: string,
    data: T,
    fieldsToEncrypt: string[] = SENSITIVE_FIELDS_STAFF as unknown as string[]
  ): Promise<void> {
    const encrypted = encryptObject(data, fieldsToEncrypt as any);

    await this.secureStaff.put({
      id,
      encryptedData: JSON.stringify(encrypted),
      lastModified: Date.now(),
    });
  }

  async getSecureStaff<T>(
    id: string,
    fieldsToDecrypt: string[] = SENSITIVE_FIELDS_STAFF as unknown as string[]
  ): Promise<T | undefined> {
    const record = await this.secureStaff.get(id);
    if (!record) return undefined;

    const decrypted = JSON.parse(record.encryptedData);
    return decryptObject(decrypted, fieldsToDecrypt as any) as T;
  }

  async saveSecureCustomer<T extends Record<string, any>>(
    id: string,
    data: T,
    fieldsToEncrypt: string[] = SENSITIVE_FIELDS_CUSTOMER as unknown as string[]
  ): Promise<void> {
    const encrypted = encryptObject(data, fieldsToEncrypt as any);

    await this.secureCustomers.put({
      id,
      encryptedData: JSON.stringify(encrypted),
      lastModified: Date.now(),
    });
  }

  async getSecureCustomer<T>(
    id: string,
    fieldsToDecrypt: string[] = SENSITIVE_FIELDS_CUSTOMER as unknown as string[]
  ): Promise<T | undefined> {
    const record = await this.secureCustomers.get(id);
    if (!record) return undefined;

    const decrypted = JSON.parse(record.encryptedData);
    return decryptObject(decrypted, fieldsToDecrypt as any) as T;
  }
}

export const secureDb = new SecureDexieDatabase();

export async function migrateToSecureStorage(): Promise<void> {
  const { db: originalDb } = await import("~/db/db");

  const transactions = await originalDb.transactions.toArray();
  for (const tx of transactions) {
    await secureDb.saveSecureTransaction(tx.id, tx as any);
  }

  const staff = await originalDb.staff.toArray();
  for (const s of staff) {
    await secureDb.saveSecureStaff(s.id, s as any);
  }

  const customers = await originalDb.customers?.toArray() || [];
  for (const c of customers) {
    await secureDb.saveSecureCustomer(c.id, c as any);
  }

  console.log("[SecureDB] Migration completed successfully");
}

export async function getConflictResolution(
  localData: { lastModified: number; deviceId: string },
  serverData: { lastModified: number }
): Promise<"local" | "server" | "merge"> {
  if (localData.lastModified > serverData.lastModified) {
    return "local";
  } else if (serverData.lastModified > localData.lastModified) {
    return "server";
  }
  return "merge";
}
