import Dexie, { type EntityTable } from 'dexie';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '~/data/mockProducts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawMaterialCost {
  name: string;
  cost: number;
  unit: string;
  quantity: number;
}

export interface VariantOption {
  name: string;
  priceModifier: number;
}

export interface VariantGroup {
  id: string;
  name: string;
  isRequired: boolean;
  type: 'SINGLE' | 'MULTIPLE';
  options: VariantOption[];
}

/** Shared variant template that can be reused across products */
export interface VariantTemplate {
  id: string;
  name: string;
  isRequired: boolean;
  type: 'SINGLE' | 'MULTIPLE';
  options: VariantOption[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cogs: number;
  category: string;
  stock: number;
  image: string;
  rawMaterials?: RawMaterialCost[];
  variants?: VariantGroup[];
}

export interface Category {
  id: string;
  name: string;
  orderIndex: number;
  icon?: string; // Emoji or Lucide icon name
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  totalAmount: number;    // Final amount received (net)
  originalAmount: number; // Subtotal/Cart Total before adjustments
  cogsTotal: number;       // HPP total for this transaction (computed at checkout)
  paymentMethod: string;
  timestamp: number;
  status: 'PENDING' | 'SYNCED';
  isBackdated: boolean;
  backdatedNote?: string;
  isAdjustment?: boolean;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  quantity: number;
  priceAtTime: number;
  cogsAtTime: number;      // COGS per unit at time of sale
  selectedVariants?: { groupName: string; optionName: string; priceModifier: number }[];
}

export type ExpenseCategory =
  | 'bahan_baku'
  | 'operasional'
  | 'sewa'
  | 'gaji'
  | 'utilitas'
  | 'marketing'
  | 'lainnya';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  bahan_baku: 'Bahan Baku / Restok',
  operasional: 'Operasional',
  sewa: 'Sewa Tempat',
  gaji: 'Gaji Karyawan',
  utilitas: 'Listrik & Air',
  marketing: 'Promosi & Marketing',
  lainnya: 'Lain-lain',
};

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  timestamp: number;
  isBackdated: boolean;
}

/** Simple key-value store for app settings (QRIS image, etc.) */
export interface AppSetting {
  key: string;
  value: string;
}

// ─── Database ─────────────────────────────────────────────────────────────────

export class PosDatabase extends Dexie {
  products!: EntityTable<Product, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transactionItems!: EntityTable<TransactionItem, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  settings!: EntityTable<AppSetting, 'key'>;
  variantTemplates!: EntityTable<VariantTemplate, 'id'>;

  constructor() {
    super('ngepos_db');

    this.version(2).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
    });

    // Version 3: add expenses & settings tables; add cogsTotal to transactions
    this.version(3).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
    }).upgrade(tx => {
      // Backfill cogsTotal = 0 for existing transactions
      return tx.table('transactions').toCollection().modify(t => {
        t.cogsTotal ??= 0;
      });
    });

    // Version 5: add originalAmount to transactions
    this.version(5).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
    }).upgrade(tx => {
      // Backfill originalAmount = totalAmount for existing transactions
      return tx.table('transactions').toCollection().modify(t => {
        t.originalAmount ??= t.totalAmount;
      });
    });
  }
}

export const db = new PosDatabase();

// ─── Settings helpers ─────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedDatabase() {
  const productCount = await db.products.count();
  if (productCount === 0 || (MOCK_PRODUCTS[0] as any).variants) {
    try {
      console.log('Seeding Database Ngepos...');
      await db.categories.clear();
      await db.products.clear();

      const categories: Category[] = MOCK_CATEGORIES.map((cat, idx) => ({
        id: `cat_${idx}`,
        name: cat,
        orderIndex: idx,
      }));
      await db.categories.bulkAdd(categories);

      const products = MOCK_PRODUCTS.map(p => ({
        ...p,
        cogs: p.price! * 0.45,
      })) as Product[];
      await db.products.bulkAdd(products);
      console.log('Database seeded.');
    } catch (err) {
      console.error(err);
    }
  }
}
