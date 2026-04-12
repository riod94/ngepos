import { createSignal, createResource, For, Show, onMount } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import {
	ArrowLeft,
	ShieldCheck,
	Plus,
	Trash2,
	Pencil,
	Check,
	ShieldAlert,
	Info,
	Lock,
} from "lucide-solid";
import { db, Role } from "~/db/db";
import { toast } from "solid-toast";
import { Button } from "~/components/ui/button";

const ALL_PERMISSIONS = [
	{ id: "POS_ACCESS", label: "Akses Menu Kasir & Transaksi", icon: "🛒" },
	{ id: "VIEW_HISTORY", label: "Lihat Riwayat Penjualan", icon: "📜" },
	{
		id: "DELETE_TRANSACTION",
		label: "Hapus Transaksi dari Riwayat",
		icon: "⚠️",
	},
	{ id: "MANAGE_EXPENSES", label: "Kelola Biaya & Pengeluaran", icon: "💸" },
	{ id: "VIEW_REPORTS", label: "Lihat Laporan Laba/Rugi", icon: "📈" },
	{ id: "MANAGE_PRODUCTS", label: "Kelola Produk & Stok", icon: "📦" },
	{ id: "MANAGE_CATEGORIES", label: "Kelola Kategori Produk", icon: "🏷️" },
	{ id: "MANAGE_OUTLET", label: "Kelola Informasi Outlet", icon: "🏢" },
	{
		id: "MANAGE_PAYMENTS",
		label: "Kelola QRIS & Kanal Penjualan",
		icon: "💳",
	},
	{ id: "MANAGE_STAFF", label: "Kelola Staff & Hak Akses (RBAC)", icon: "👥" },
];

export default function RoleManagement() {
	const navigate = useNavigate();
	const [isModalOpen, setIsModalOpen] = createSignal(false);
	const [editingRole, setEditingRole] = createSignal<Role | null>(null);
	const [roleName, setRoleName] = createSignal("");
	const [selectedPerms, setSelectedPerms] = createSignal<string[]>([]);

	const [roles, { refetch }] = createResource(async () => {
		const data = await db.roles.toArray();
		// Auto-seed if empty
		if (data.length === 0) {
			const defaultRoles: Role[] = [
				{
					id: "admin",
					name: "Super Admin",
					permissions: ALL_PERMISSIONS.map((p) => p.id),
				},
				{
					id: "kasir",
					name: "Kasir Standar",
					permissions: ["POS_ACCESS", "VIEW_HISTORY"],
				},
			];
			await db.roles.bulkAdd(defaultRoles);
			return await db.roles.toArray();
		}
		return data;
	});

	const handleOpenModal = (role: Role | null = null) => {
		if (role?.id === "admin") {
			toast.error(
				"Peran Super Admin bersifat permanen dan tidak dapat diubah",
			);
			return;
		}
		if (role) {
			setEditingRole(role);
			setRoleName(role.name);
			setSelectedPerms(role.permissions);
		} else {
			setEditingRole(null);
			setRoleName("");
			setSelectedPerms(["POS_ACCESS"]); // Default permission
		}
		setIsModalOpen(true);
	};

	const togglePermission = (id: string) => {
		const current = selectedPerms();
		if (current.includes(id)) {
			setSelectedPerms(current.filter((p) => p !== id));
		} else {
			setSelectedPerms([...current, id]);
		}
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!roleName().trim()) {
			toast.error("Nama peran wajib diisi");
			return;
		}

		try {
			const roleData: Role = {
				id: editingRole()?.id || crypto.randomUUID(),
				name: roleName().trim(),
				permissions: selectedPerms(),
			};

			await db.roles.put(roleData);
			toast.success(
				editingRole() ? "Peran diperbarui" : "Peran baru ditambahkan",
			);
			setIsModalOpen(false);
			refetch();
		} catch (err) {
			console.error(err);
			toast.error("Gagal menyimpan peran");
		}
	};

	const deleteRole = async (role: Role) => {
		if (role.id === "admin") {
			toast.error("Peran Super Admin tidak dapat dihapus");
			return;
		}
		if (
			!confirm(
				`Hapus peran "${role.name}"? Staff dengan peran ini mungkin kehilangan akses.`,
			)
		)
			return;

		try {
			await db.roles.delete(role.id);
			toast.success("Peran berhasil dihapus");
			refetch();
		} catch (err) {
			toast.error("Gagal menghapus peran");
		}
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			{/* Header */}
			<div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-30 backdrop-blur-xl">
				<div class="flex items-center gap-3">
					<button
						onClick={() => navigate(-1)}
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 class="font-bold text-lg tracking-tight leading-none">
							Hak Akses & Peran
						</h1>
						<span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
							Atur izin & peran staff dinamis
						</span>
					</div>
				</div>
				<Button
					onClick={() => handleOpenModal()}
					class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2"
				>
					<Plus size={16} />
					Peran Baru
				</Button>
			</div>

			<div class="p-4 max-w-lg mx-auto space-y-4">
				<div class="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-indigo-700">
					<Info size={20} class="shrink-0 mt-0.5" />
					<p class="text-xs font-semibold leading-relaxed">
						Gunakan fitur ini untuk mengatur batasan menu bagi karyawan
						Anda. Perubahan pada hak akses akan langsung berdampak pada
						staff yang menggunakan peran tersebut.
					</p>
				</div>

				<div class="space-y-3">
					<For each={roles()}>
						{(role) => (
							<div
								onClick={() => handleOpenModal(role)}
								class={`bg-card border-2 border-border/60 rounded-[28px] p-5 transition-all group ${
									role.id === "admin"
										? "cursor-not-allowed opacity-80"
										: "cursor-pointer hover:border-primary/30 active:scale-[0.99] hover:bg-muted/10"
								}`}
							>
								<div class="flex items-center justify-between mb-4">
									<div class="flex items-center gap-3">
										<div
											class={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${role.id === "admin" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" : "bg-muted text-muted-foreground"}`}
										>
											<Show
												when={role.id === "admin"}
												fallback={<ShieldCheck size={20} />}
											>
												<Lock size={18} />
											</Show>
										</div>
										<div>
											<div class="flex items-center gap-2">
												<h3 class="font-black text-base tracking-tight">
													{role.name}
												</h3>
												<Show when={role.id === "admin"}>
													<span class="text-[9px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">
														System
													</span>
												</Show>
											</div>
											<p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
												{role.permissions.length} Izin Aktif
											</p>
										</div>
									</div>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<Show when={role.id !== "admin"}>
											<button
												onClick={(e) => {
													e.stopPropagation();
													deleteRole(role);
												}}
												class="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
												aria-label="Hapus Peran"
											>
												<Trash2 size={18} />
											</button>
										</Show>
									</div>
								</div>

								<div class="flex flex-wrap gap-1.5">
									<For each={role.permissions.slice(0, 4)}>
										{(permId) => {
											const perm = ALL_PERMISSIONS.find(
												(p) => p.id === permId,
											);
											return (
												<span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/20">
													{perm?.label}
												</span>
											);
										}}
									</For>
									<Show when={role.permissions.length > 4}>
										<span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
											+{role.permissions.length - 4} Lainnya
										</span>
									</Show>
								</div>
							</div>
						)}
					</For>
				</div>
			</div>

			{/* Modal Peran */}
			<Show when={isModalOpen()}>
				<div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
					<div
						class="absolute inset-0 bg-black/60 backdrop-blur-sm"
						onClick={() => setIsModalOpen(false)}
					/>
					<div class="relative w-full max-w-md bg-background rounded-t-[32px] sm:rounded-[32px] shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
						<div class="p-6 border-b border-border/40 shrink-0">
							<div class="flex items-center justify-between">
								<div>
									<h2 class="text-2xl font-black tracking-tight">
										{editingRole() ? "Edit Peran" : "Peran Baru"}
									</h2>
									<p class="text-sm text-muted-foreground font-semibold">
										Atur nama & hak akses secara dinamis.
									</p>
								</div>
								<div class="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
									<ShieldCheck size={28} />
								</div>
							</div>
						</div>

						<div class="flex-1 overflow-y-auto p-6 space-y-6">
							<div class="space-y-2">
								<label
									for="role-name"
									class="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground"
								>
									Nama Jabatan / Peran
								</label>
								<input
									id="role-name"
									type="text"
									placeholder="Contoh: Supervisor, Admin Cabang"
									value={roleName()}
									onInput={(e) => setRoleName(e.currentTarget.value)}
									class="w-full bg-muted/30 border-border/40 border-2 rounded-2xl h-14 px-4 font-bold focus:border-primary outline-none transition-all"
								/>
							</div>

							<div class="space-y-4">
								<label class="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground block">
									Daftar Izin Akses
								</label>
								<div class="grid grid-cols-1 gap-2">
									<For each={ALL_PERMISSIONS}>
										{(perm) => (
											<button
												onClick={() => togglePermission(perm.id)}
												class={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
													selectedPerms().includes(perm.id)
														? "bg-primary/5 border-primary text-foreground shadow-sm"
														: "bg-card border-border/40 text-muted-foreground hover:border-border"
												}`}
											>
												<div class="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center text-xl shrink-0">
													{perm.icon}
												</div>
												<div class="flex-1 min-w-0">
													<p
														class={`text-sm font-black tracking-tight ${selectedPerms().includes(perm.id) ? "text-primary" : ""}`}
													>
														{perm.label}
													</p>
													<p class="text-[10px] font-semibold opacity-60 truncate">
														Klik untuk{" "}
														{selectedPerms().includes(perm.id)
															? "mencabut"
															: "memberikan"}{" "}
														akses ini
													</p>
												</div>
												<div
													class={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
														selectedPerms().includes(perm.id)
															? "bg-primary border-primary text-white scale-110"
															: "border-border/60"
													}`}
												>
													<Show
														when={selectedPerms().includes(
															perm.id,
														)}
													>
														<Check size={14} stroke-width={4} />
													</Show>
												</div>
											</button>
										)}
									</For>
								</div>
							</div>
						</div>

						<div class="p-6 border-t border-border/40 bg-muted/30 shrink-0 flex gap-3">
							<button
								onClick={() => setIsModalOpen(false)}
								class="flex-1 h-14 rounded-2xl bg-white border border-border/60 font-black text-sm hover:bg-card transition-colors"
							>
								Batal
							</button>
							<button
								onClick={handleSubmit}
								class="flex-[2] h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all"
							>
								Simpan Peran
							</button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
