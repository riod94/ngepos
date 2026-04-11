import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
	type Transaction, 
	type TransactionItem, 
	type Expense, 
	EXPENSE_CATEGORY_LABELS 
} from "~/db/db";

// Helper untuk format rupiah
const fmt = (n: number) => `Rp ${Math.abs(n || 0).toLocaleString("id-ID")}`;

// Helper untuk format tanggal
const formatDate = (ts: number) => {
	const d = new Date(ts);
	return d.toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

interface ReportSummary {
	periodLabel: string;
	omset: number;
	cogsTotal: number;
	grossProfit: number;
	platformAdjustment: number;
	expenses: number;
	netProfit: number;
	modalReturn: number;
	trueProfit: number;
	txCount: number;
	expenseCount: number;
}

interface OutletInfo {
	name: string;
	address: string;
	phone: string;
	logo?: string; // Base64
}

export const exportService = {
	/**
	 * Export data ke Excel (.xlsx) dengan 4 sheet
	 */
	async exportToExcel(
		summary: ReportSummary,
		transactions: Transaction[],
		txItems: TransactionItem[],
		expenses: Expense[],
	) {
		const wb = XLSX.utils.book_new();

		// 1. Sheet Ringkasan
		const ringkasanData = [
			["LAPORAN RINGKASAN FINANSIAL"],
			["Periode", summary.periodLabel],
			[""],
			["METRIK UTAMA", "NILAI"],
			["Total Omset", summary.omset],
			["Penyesuaian Platform", summary.platformAdjustment],
			["HPP (Modal Terjual)", summary.cogsTotal],
			["Laba Kotor", summary.grossProfit],
			["Total Biaya Operasional", summary.expenses],
			["Laba Bersih (Net Profit)", summary.netProfit],
			["Alokasi Modal (HPP Kembali)", summary.modalReturn],
			["Profit Murni (Uang Bebas)", summary.trueProfit],
			[""],
			["STATISTIK"],
			["Jumlah Transaksi", summary.txCount],
			["Jumlah Pengeluaran", summary.expenseCount],
		];
		const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
		XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");

		// 2. Sheet Transaksi
		const txData = transactions.map((t) => ({
			"ID Transaksi": t.id,
			"No. Struk": t.receiptNumber,
			"Tanggal": formatDate(t.timestamp),
			"Metode": t.paymentMethod,
			"Total Akhir": t.totalAmount,
			"Subtotal": t.originalAmount,
			"Potongan": t.discountTotal || 0,
			"HPP": t.cogsTotal,
			"Status": t.status,
			"Backdated": t.isBackdated ? "Ya" : "Tidak",
		}));
		const wsTx = XLSX.utils.json_to_sheet(txData);
		XLSX.utils.book_append_sheet(wb, wsTx, "Transaksi");

		// 3. Sheet Detail Produk
		const detailData = txItems.map((item) => {
			const tx = transactions.find((t) => t.id === item.transactionId);
			const variants = item.selectedVariants
				?.map((v) => `${v.groupName}: ${v.optionName}`)
				.join(", ");

			return {
				"No. Struk": tx?.receiptNumber || "-",
				"Tanggal": tx ? formatDate(tx.timestamp) : "-",
				"Nama Produk": item.productName,
				"Varian": variants || "-",
				"Qty": item.quantity,
				"Harga Satuan": item.priceAtTime,
				"Total Harga": item.priceAtTime * item.quantity,
				"HPP Satuan": item.cogsAtTime,
				"Total HPP": item.cogsAtTime * item.quantity,
			};
		});
		const wsDetail = XLSX.utils.json_to_sheet(detailData);
		XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Produk");

		// 4. Sheet Pengeluaran
		const expData = expenses.map((e) => ({
			"Tanggal": formatDate(e.timestamp),
			"Kategori": EXPENSE_CATEGORY_LABELS[e.category] || e.category,
			"Deskripsi": e.description,
			"Jumlah": e.amount,
			"Backdated": e.isBackdated ? "Ya" : "Tidak",
		}));
		const wsExp = XLSX.utils.json_to_sheet(expData);
		XLSX.utils.book_append_sheet(wb, wsExp, "Pengeluaran");

		// Download file
		const fileName = `Laporan_Ngepos_${summary.periodLabel.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;
		XLSX.writeFile(wb, fileName);
	},

	/**
	 * Export data ke PDF yang sudah di-styling premium
	 */
	async exportToPDF(
		summary: ReportSummary,
		transactions: Transaction[],
		txItems: TransactionItem[],
		expenses: Expense[],
		outlet: OutletInfo,
	) {
		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.width;

		// 1. Header & Logo
		if (outlet.logo) {
			try {
				doc.addImage(outlet.logo, "PNG", 15, 15, 25, 25);
			} catch (e) {
				console.error("Gagal memuat logo ke PDF", e);
			}
		}

		doc.setFont("helvetica", "bold");
		doc.setFontSize(22);
		doc.setTextColor(15, 23, 42); // slate-900
		doc.text(outlet.name || "NGEPOS", outlet.logo ? 45 : 15, 25);
		
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.setTextColor(100, 116, 139); // slate-500
		doc.text(outlet.address || "-", outlet.logo ? 45 : 15, 32);
		doc.text(`Telp: ${outlet.phone || "-"}`, outlet.logo ? 45 : 15, 37);

		doc.setDrawColor(226, 232, 240); // slate-200
		doc.line(15, 45, pageWidth - 15, 45);

		// 2. Judul Laporan
		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.setTextColor(15, 23, 42);
		doc.text("LAPORAN RINGKASAN KEUANGAN", 15, 58);
		
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.text(`Periode: ${summary.periodLabel}`, 15, 65);

		// 3. Ringkasan Metrik (Grid-like table)
		autoTable(doc, {
			startY: 75,
			head: [["Metrik Utama", "Nilai"]],
			body: [
				["Total Omset", fmt(summary.omset)],
				["Penyesuaian Platform", (summary.platformAdjustment >= 0 ? "+" : "-") + fmt(summary.platformAdjustment)],
				["HPP (Modal Terjual)", fmt(summary.cogsTotal)],
				["Laba Kotor", fmt(summary.grossProfit)],
				["Biaya Operasional", fmt(summary.expenses)],
				["Laba Bersih (Net Profit)", fmt(summary.netProfit)],
				["Alokasi Modal Kembali", fmt(summary.modalReturn)],
				["Profit Murni (Uang Bebas)", fmt(summary.trueProfit)],
			],
			theme: "grid",
			headStyles: { fillColor: [79, 70, 229], textColor: 255 }, // indigo-600
			styles: { font: "helvetica", fontSize: 10 },
			columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
		});

		// 4. Tabel Transaksi Terakhir (Sampel 100 terakhir jika banyak)
		doc.setFontSize(14);
		doc.text("Riwayat Transaksi (Terbaru)", 15, (doc as any).lastAutoTable.finalY + 15);

		const txRows = transactions.slice(0, 100).map(t => [
			formatDate(t.timestamp),
			t.receiptNumber,
			t.paymentMethod,
			fmt(t.totalAmount)
		]);

		autoTable(doc, {
			startY: (doc as any).lastAutoTable.finalY + 20,
			head: [["Tanggal", "No. Struk", "Metode", "Total"]],
			body: txRows,
			styles: { fontSize: 8 },
			headStyles: { fillColor: [30, 41, 59] }, // slate-800
		});

		// 5. Tabel Detail Barang (NEW)
		doc.addPage();
		doc.setFontSize(14);
		doc.text("Detail Barang Terjual", 15, 20);

		const detailRows = txItems.map(item => {
			const tx = transactions.find(t => t.id === item.transactionId);
			const variants = item.selectedVariants
				?.map((v) => `${v.groupName}: ${v.optionName}`)
				.join(", ");
			
			return [
				tx?.receiptNumber || "-",
				item.productName + (variants ? ` (${variants})` : ""),
				item.quantity,
				fmt(item.priceAtTime),
				fmt(item.priceAtTime * item.quantity)
			];
		});

		autoTable(doc, {
			startY: 25,
			head: [["No. Struk", "Produk", "Qty", "Harga", "Total"]],
			body: detailRows,
			styles: { fontSize: 7 },
			headStyles: { fillColor: [79, 70, 229] }, // indigo-600
			columnStyles: {
				2: { halign: "center" },
				3: { halign: "right" },
				4: { halign: "right" }
			}
		});

		// 6. Tabel Pengeluaran
		if (expenses.length > 0) {
			doc.addPage();
			doc.setFontSize(14);
			doc.text("Detail Pengeluaran", 15, 20);

			const expRows = expenses.map(e => [
				formatDate(e.timestamp),
				EXPENSE_CATEGORY_LABELS[e.category] || e.category,
				e.description,
				fmt(e.amount)
			]);

			autoTable(doc, {
				startY: 25,
				head: [["Tanggal", "Kategori", "Keterangan", "Jumlah"]],
				body: expRows,
				styles: { fontSize: 8 },
				headStyles: { fillColor: [153, 27, 27] }, // red-800
			});
		}

		// Footer
		const totalPages = doc.internal.pages.length - 1;
		for (let i = 1; i <= totalPages; i++) {
			doc.setPage(i);
			doc.setFontSize(8);
			doc.setTextColor(150);
			doc.text(`Dicetak otomatis oleh Ngepos pada ${formatDate(Date.now())} - Halaman ${i} dari ${totalPages}`, 15, doc.internal.pageSize.height - 10);
		}

		doc.save(`Laporan_Ngepos_${summary.periodLabel.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
	},
};
