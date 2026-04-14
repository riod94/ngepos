export interface Permission {
	id: string;
	label: string;
	icon: string;
	category: string;
}

export const PERMISSION_CATEGORIES = [
	{ id: "transaction", label: "Transaksi & Kasir", icon: "💰" },
	{ id: "inventory", label: "Produk & Stok", icon: "📦" },
	{ id: "marketing", label: "Promosi & Pelanggan", icon: "📢" },
	{ id: "finance", label: "Keuangan & Laporan", icon: "📊" },
	{ id: "system", label: "Pengaturan Sistem", icon: "⚙️" },
];

export const ALL_PERMISSIONS: Permission[] = [
	// Transaksi
	{ id: "POS_ACCESS", label: "Akses Menu Kasir", icon: "🛒", category: "transaction" },
	{ id: "VIEW_TRANSACTIONS", label: "Lihat Riwayat Penjualan", icon: "📜", category: "transaction" },
	{ id: "VOID_TRANSACTION", label: "Batalkan/Hapus Transaksi", icon: "⚠️", category: "transaction" },

	// Produk & Stok
	{ id: "VIEW_PRODUCTS", label: "Lihat Katalog Produk", icon: "🍱", category: "inventory" },
	{ id: "MANAGE_PRODUCTS", label: "Kelola Produk & Varian", icon: "🛠️", category: "inventory" },
	{ id: "VIEW_MATERIALS", label: "Lihat Stok Bahan Baku", icon: "🌾", category: "inventory" },
	{ id: "MANAGE_MATERIALS", label: "Kelola Bahan Baku & Stok", icon: "⚖️", category: "inventory" },
	{ id: "MANAGE_CATEGORIES", label: "Kelola Kategori Produk", icon: "🏷️", category: "inventory" },

	// Marketing
	{ id: "MANAGE_PROMOS", label: "Kelola Promo & Bundle", icon: "🎁", category: "marketing" },
	{ id: "VIEW_MEMBERS", label: "Lihat Database Pelanggan", icon: "👥", category: "marketing" },
	{ id: "MANAGE_MEMBERS", label: "Kelola Data Pelanggan", icon: "👤", category: "marketing" },
	{ id: "MANAGE_LOYALTY", label: "Kelola Program Loyalty/Stamps", icon: "✨", category: "marketing" },

	// Keuangan
	{ id: "VIEW_REPORTS", label: "Lihat Laporan Keuangan", icon: "📈", category: "finance" },
	{ id: "MANAGE_EXPENSES", label: "Kelola Biaya & Pengeluaran", icon: "💸", category: "finance" },

	// Sistem
	{ id: "MANAGE_OUTLET", label: "Kelola Informasi Outlet", icon: "🏢", category: "system" },
	{ id: "MANAGE_PRINTER", label: "Pengaturan Struk & Printer", icon: "🖨️", category: "system" },
	{ id: "MANAGE_PAYMENTS", label: "Pengaturan Metode Pembayaran", icon: "💳", category: "system" },
	{ id: "MANAGE_STAFF", label: "Kelola Staff & Hak Akses", icon: "🛡️", category: "system" },
];
