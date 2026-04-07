import Dexie, { type EntityTable } from 'dexie';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '~/data/mockProducts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawMaterialCost {
  id: string;
  name: string;
  cost: number; // Total cost (quantity * costPerUnit)
  unit: string;
  quantity: number;
  costPerUnit?: number;
}

/** Pre-saved material in the library */
export interface RawMaterialLibrary {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

export interface VariantOption {
  name: string;
  priceModifier: number;
  cogsModifier: number;
}

export interface VariantGroup {
  id: string;
  name: string;
  isRequired: boolean;
  type: 'SINGLE' | 'MULTIPLE';
  maxSelectable?: number;
  options: VariantOption[];
}

/** Shared variant template that can be reused across products */
export interface VariantTemplate {
  id: string;
  name: string;
  isRequired: boolean;
  type: 'SINGLE' | 'MULTIPLE';
  maxSelectable?: number;
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
  discountTotal?: number;  // Total discount applied
  discountNote?: string;   // Description of applied discount
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

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Staff {
  id: string;
  name: string;
  roleId: string;
  pin: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: number;
}

/** Simple key-value store for app settings (QRIS image, etc.) */
export interface AppSetting {
  key: string;
  value: string;
}

export interface Discount {
  id: string;
  name: string;
  type: 'PERCENT' | 'FIXED' | 'QUANTITY';
  value: number; // For PERCENT or FIXED
  buyQty?: number; // For QUANTITY
  getQty?: number; // For QUANTITY
  isActive: boolean;
  productId?: string; // If specific to one product
}

export interface BundleItem {
  productId: string;
  quantity: number;
  variantHash: string; // Combined option names
}

export interface Bundle {
  id: string;
  name: string;
  price: number;
  cogs: number;
  image?: string;
  isActive: boolean;
  items: BundleItem[];
}

// ─── Campaign / Promo V2 Types ───────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: 'BUNDLE' | 'BUY_X_GET_Y' | 'BULK_DISCOUNT';
  isActive: boolean;
  priority: number;
  startDate?: number;
  endDate?: number;
}

export interface CampaignItem {
  id: string;
  campaignId: string;
  productId: string;
  type: 'REQUIREMENT' | 'TARGET_DISCOUNT';
  quantity: number;
}

export interface CampaignReward {
  id: string;
  campaignId: string;
  rewardType: 'FREE_PRODUCT' | 'FIXED_DISCOUNT' | 'PERCENT_DISCOUNT';
  productId?: string; // If FREE_PRODUCT
  value: number; // Discount amount or free qty
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
  staff!: EntityTable<Staff, 'id'>;
  roles!: EntityTable<Role, 'id'>;
  rawMaterialLibrary!: EntityTable<RawMaterialLibrary, 'id'>;
  discounts!: EntityTable<Discount, 'id'>;
  bundles!: EntityTable<Bundle, 'id'>;
  campaigns!: EntityTable<Campaign, 'id'>;
  campaignItems!: EntityTable<CampaignItem, 'id'>;
  campaignRewards!: EntityTable<CampaignReward, 'id'>;

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

    // Version 6: add staff table
    this.version(6).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
      staff: 'id, name, role, isActive',
    });

    // Version 8: add email to staff
    this.version(8).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
      staff: 'id, name, roleId, email, isActive',
      roles: 'id, name',
    });

    // Version 9: internal cogsModifier added to variants objects (not indexed separately)
    this.version(9).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
      staff: 'id, name, roleId, email, isActive',
      roles: 'id, name',
    });

    // Version 10: adding maxSelectable to variants objects (not indexed separately)
    this.version(10).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
      staff: 'id, name, roleId, email, isActive',
      roles: 'id, name',
    });

    // Version 11: add rawMaterialLibrary table
    this.version(11).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
      staff: 'id, name, roleId, email, isActive',
      roles: 'id, name',
      rawMaterialLibrary: 'id, name',
    });

    // Version 12: add discounts & bundles tables
    this.version(12).stores({
      discounts: 'id, productId, isActive',
      bundles: 'id, name, isActive',
    });
    
    // Version 13: add campaigns, campaignItems, campaignRewards
    this.version(13).stores({
      products: 'id, name, category, stock',
      categories: 'id, orderIndex',
      transactions: 'id, receiptNumber, timestamp, status',
      transactionItems: 'id, transactionId, productId',
      expenses: 'id, category, timestamp',
      settings: 'key',
      variantTemplates: 'id, name',
      staff: 'id, name, roleId, email, isActive',
      roles: 'id, name',
      rawMaterialLibrary: 'id, name',
      discounts: 'id, productId, isActive',
      bundles: 'id, name, isActive',
      campaigns: 'id, name, type, isActive',
      campaignItems: 'id, campaignId, productId, type',
      campaignRewards: 'id, campaignId, rewardType',
    });

    this.products = this.table('products');
    this.categories = this.table('categories');
    this.transactions = this.table('transactions');
    this.transactionItems = this.table('transactionItems');
    this.expenses = this.table('expenses');
    this.settings = this.table('settings');
    this.variantTemplates = this.table('variantTemplates');
    this.staff = this.table('staff');
    this.roles = this.table('roles');
    this.rawMaterialLibrary = this.table('rawMaterialLibrary');
    this.discounts = this.table('discounts');
    this.bundles = this.table('bundles');
    this.campaigns = this.table('campaigns');
    this.campaignItems = this.table('campaignItems');
    this.campaignRewards = this.table('campaignRewards');
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
        cogs: 0,
      })) as Product[];
      await db.products.bulkAdd(products);
      console.log('Database seeded.');
    } catch (err) {
      console.error(err);
    }
  }
}
