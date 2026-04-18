import { db } from "~/db/db";

export interface BackupMetadata {
  id: string;
  timestamp: number;
  version: string;
  size: number;
  recordCounts: {
    products: number;
    transactions: number;
    customers: number;
    staff: number;
    expenses: number;
    settings: number;
  };
  checksum: string;
}

export interface BackupOptions {
  encrypt?: boolean;
  compression?: boolean;
  includeTransactions?: boolean;
  dateRange?: { start: number; end: number };
}

const BACKUP_PREFIX = "ngepos_backup_";
const MAX_BACKUPS = 5;
const APP_VERSION = "0.4.0";

class BackupService {
  private getBackupId(): string {
    return `${BACKUP_PREFIX}${Date.now()}`;
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async getBackupList(): Promise<BackupMetadata[]> {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(BACKUP_PREFIX));

    return keys.map((key) => {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      try {
        return JSON.parse(stored) as BackupMetadata;
      } catch {
        return null;
      }
    }).filter(Boolean).sort((a, b) => b!.timestamp - a!.timestamp) as BackupMetadata[];
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupMetadata> {
    const backupId = this.getBackupId();
    const timestamp = Date.now();

    const recordCounts = {
      products: await db.products.count(),
      transactions: await db.transactions.count(),
      customers: await db.customers.count(),
      staff: await db.staff.count(),
      expenses: await db.expenses.count(),
      settings: await db.settings.count(),
    };

    const backupData: any = {
      version: APP_VERSION,
      timestamp,
      products: await db.products.toArray(),
      categories: await db.categories.toArray(),
      customers: await db.customers.toArray(),
      loyaltyPrograms: await db.loyaltyPrograms.toArray(),
      customerStamps: await db.customerStamps.toArray(),
      customerRewards: await db.customerRewards.toArray(),
      rawMaterials: await db.rawMaterialLibrary.toArray(),
      inventoryLogs: await db.inventoryLogs.toArray(),
      staff: await db.staff.toArray(),
      roles: await db.roles.toArray(),
      settings: await db.settings.toArray(),
      discounts: await db.discounts.toArray(),
      bundles: await db.bundles.toArray(),
      campaigns: await db.campaigns.toArray(),
      variantTemplates: await db.variantTemplates.toArray(),
    };

    if (options.includeTransactions !== false) {
      if (options.dateRange) {
        backupData.transactions = await db.transactions
          .where("timestamp")
          .between(options.dateRange.start, options.dateRange.end)
          .toArray();
        backupData.transactionItems = await db.transactionItems
          .where("transactionId")
          .anyOf(backupData.transactions.map((t: any) => t.id))
          .toArray();
      } else {
        backupData.transactions = await db.transactions.toArray();
        backupData.transactionItems = await db.transactionItems.toArray();
      }
    }

    backupData.expenses = await db.expenses.toArray();

    let serialized = JSON.stringify(backupData);

    if (options.compression) {
      serialized = this.compress(serialized);
    }

    const checksum = await this.calculateChecksum(serialized);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      version: APP_VERSION,
      size: new Blob([serialized]).size,
      recordCounts,
      checksum,
    };

    localStorage.setItem(backupId, JSON.stringify(metadata));
    localStorage.setItem(`${backupId}_data`, serialized);

    await this.cleanupOldBackups();

    return metadata;
  }

  async restoreBackup(backupId: string): Promise<void> {
    const dataStr = localStorage.getItem(`${backupId}_data`);
    if (!dataStr) {
      throw new Error("Backup data not found");
    }

    const metadataStr = localStorage.getItem(backupId);
    if (!metadataStr) {
      throw new Error("Backup metadata not found");
    }

    const metadata: BackupMetadata = JSON.parse(metadataStr);
    const checksum = await this.calculateChecksum(dataStr);

    if (checksum !== metadata.checksum) {
      throw new Error("Backup integrity check failed - data may be corrupted");
    }

    const backupData = JSON.parse(dataStr);

    await db.transaction("rw", db.tables, async () => {
      for (const table of db.tables) {
        await db.table(table).clear();
      }

      if (backupData.products?.length) await db.products.bulkAdd(backupData.products);
      if (backupData.categories?.length) await db.categories.bulkAdd(backupData.categories);
      if (backupData.customers?.length) await db.customers.bulkAdd(backupData.customers);
      if (backupData.loyaltyPrograms?.length) await db.loyaltyPrograms.bulkAdd(backupData.loyaltyPrograms);
      if (backupData.customerStamps?.length) await db.customerStamps.bulkAdd(backupData.customerStamps);
      if (backupData.customerRewards?.length) await db.customerRewards.bulkAdd(backupData.customerRewards);
      if (backupData.rawMaterials?.length) await db.rawMaterialLibrary.bulkAdd(backupData.rawMaterials);
      if (backupData.inventoryLogs?.length) await db.inventoryLogs.bulkAdd(backupData.inventoryLogs);
      if (backupData.staff?.length) await db.staff.bulkAdd(backupData.staff);
      if (backupData.roles?.length) await db.roles.bulkAdd(backupData.roles);
      if (backupData.settings?.length) await db.settings.bulkAdd(backupData.settings);
      if (backupData.discounts?.length) await db.discounts.bulkAdd(backupData.discounts);
      if (backupData.bundles?.length) await db.bundles.bulkAdd(backupData.bundles);
      if (backupData.campaigns?.length) await db.campaigns.bulkAdd(backupData.campaigns);
      if (backupData.variantTemplates?.length) await db.variantTemplates.bulkAdd(backupData.variantTemplates);
      if (backupData.transactions?.length) await db.transactions.bulkAdd(backupData.transactions);
      if (backupData.transactionItems?.length) await db.transactionItems.bulkAdd(backupData.transactionItems);
      if (backupData.expenses?.length) await db.expenses.bulkAdd(backupData.expenses);
    });
  }

  async deleteBackup(backupId: string): Promise<void> {
    localStorage.removeItem(backupId);
    localStorage.removeItem(`${backupId}_data`);
  }

  async exportToFile(options: BackupOptions = {}): Promise<Blob> {
    const backupData = await this.createBackup(options);
    const dataStr = localStorage.getItem(`${backupData.id}_data`);
    const metadataStr = localStorage.getItem(backupData.id);

    const exportObj = {
      metadata: JSON.parse(metadataStr!),
      data: dataStr,
      exportedAt: Date.now(),
    };

    return new Blob([JSON.stringify(exportObj, null, 2)], {
      type: "application/json",
    });
  }

  async importFromFile(file: File): Promise<BackupMetadata> {
    const text = await file.text();
    const importObj = JSON.parse(text);

    if (!importObj.metadata || !importObj.data) {
      throw new Error("Invalid backup file format");
    }

    const backupId = this.getBackupId();
    const metadata: BackupMetadata = {
      ...importObj.metadata,
      id: backupId,
      timestamp: Date.now(),
    };

    localStorage.setItem(backupId, JSON.stringify(metadata));
    localStorage.setItem(`${backupId}_data`, importObj.data);

    return metadata;
  }

  private compress(data: string): string {
    const encoded = encodeURIComponent(data);
    let binary = "";
    for (let i = 0; i < encoded.length; i++) {
      binary += encoded.charCodeAt(i).toString(2).padStart(8, "0");
    }
    return btoa(binary);
  }

  private decompress(data: string): string {
    const binary = atob(data);
    const bytes = [];
    for (let i = 0; i < binary.length; i += 8) {
      bytes.push(String.fromCharCode(parseInt(binary.slice(i, i + 8), 2)));
    }
    return decodeURIComponent(bytes.join(""));
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.getBackupList();
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }
    }
  }

  getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    for (const key of Object.keys(localStorage)) {
      used += localStorage.getItem(key)?.length || 0;
    }
    const available = 5 * 1024 * 1024;
    return {
      used,
      available,
      percentage: (used / available) * 100,
    };
  }
}

export const backupService = new BackupService();
