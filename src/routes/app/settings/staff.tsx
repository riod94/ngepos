import { createSignal, createResource, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import {
	ArrowLeft,
	UserPlus,
	Shield,
	User as UserIcon,
	Phone,
	Mail,
	Key,
	Trash2,
	Pencil,
	CircleCheck,
	CircleX,
	Search,
	ChevronDown,
} from "lucide-solid";
import { db, Staff, Role } from "~/db/db";
import { toast } from "solid-toast";
import { Button } from "~/components/ui/button";

export default function StaffManagement() {
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = createSignal("");
	const [isModalOpen, setIsModalOpen] = createSignal(false);
	const [editingStaff, setEditingStaff] = createSignal<Staff | null>(null);

	// Form Signals
	const [name, setName] = createSignal("");
	const [roleId, setRoleId] = createSignal("");
	const [pin, setPin] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [phone, setPhone] = createSignal("");

	const [staffs, { refetch: refetchStaff }] = createResource(async () => {
		return await db.staff.toArray();
	});

	const [roles] = createResource(async () => {
		const data = await db.roles.toArray();
		if (data.length > 0 && !roleId()) {
			setRoleId(data[0].id);
		}
		return data;
	});

	const getRoleName = (id: string) => {
		return roles()?.find((r) => r.id === id)?.name || "Peran Tidak Ada";
	};

	const filteredStaff = () => {
		const list = staffs() || [];
		if (!searchTerm()) return list;
		return list.filter((s) =>
			s.name.toLowerCase().includes(searchTerm().toLowerCase()),
		);
	};

	const handleOpenModal = (staff: Staff | null = null) => {
		if (staff) {
			setEditingStaff(staff);
			setName(staff.name);
			setRoleId(staff.roleId);
			setPin(staff.pin);
			setEmail(staff.email || "");
			setPhone(staff.phone || "");
		} else {
			setEditingStaff(null);
			setName("");
			const defaultRole = roles()?.[0]?.id || "";
			setRoleId(defaultRole);
			setPin("");
			setEmail("");
			setPhone("");
		}
		setIsModalOpen(true);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!name() || pin().length !== 4 || !roleId()) {
			toast.error("Nama, Jabatan, dan 4 digit PIN wajib diisi");
			return;
		}

		try {
			const staffData: Staff = {
				id: editingStaff()?.id || crypto.randomUUID(),
				name: name(),
				roleId: roleId(),
				pin: pin(),
				email: email(),
				phone: phone(),
				isActive: editingStaff()?.isActive ?? true,
				createdAt: editingStaff()?.createdAt || Date.now(),
			};

			await db.staff.put(staffData);
			toast.success(
				editingStaff() ? "Data staff diperbarui" : "Staff baru ditambahkan",
			);
			setIsModalOpen(false);
			refetchStaff();
		} catch (err) {
			console.error("Gagal menyimpan data staff:", err);
			toast.error("Gagal menyimpan data staff");
		}
	};

	const toggleStatus = async (staff: Staff) => {
		try {
			await db.staff.update(staff.id, { isActive: !staff.isActive });
			toast.success(`Status ${staff.name} diperbarui`);
			refetchStaff();
		} catch (err) {
			console.error("Gagal mengubah status staff:", err);
			toast.error("Gagal mengubah status");
		}
	};

	const deleteStaff = async (id: string) => {
		if (!confirm("Hapus staff ini? Tindakan ini tidak dapat dibatalkan."))
			return;
		try {
			await db.staff.delete(id);
			toast.success("Staff berhasil dihapus");
			refetchStaff();
		} catch (err) {
			console.error("Gagal menghapus staff:", err);
			toast.error("Gagal menghapus staff");
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
							Manajemen Staff
						</h1>
						<span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
							Kelola data & jabatan karyawan
						</span>
					</div>
				</div>
				<Button
					onClick={() => handleOpenModal()}
					class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2"
				>
					<UserPlus size={16} />
					Staff Baru
				</Button>
			</div>

			<div class="p-4 space-y-4 max-w-lg mx-auto">
				{/* Help Banner */}
				<div class="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-indigo-700">
					<Shield size={20} class="shrink-0 mt-0.5" />
					<div class="text-xs font-semibold leading-relaxed">
						<p class="font-black mb-1">
							Pengaturan Hak Akses Terintegrasi
						</p>
						Hak akses staff sekarang dikelola secara dinamis melalui menu{" "}
						<A href="/app/settings/roles" class="underline font-black">
							Hak Akses & Peran
						</A>
						.
					</div>
				</div>

				{/* Search */}
				<div class="relative group">
					<Search
						class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
						size={18}
					/>
					<input
						type="text"
						placeholder="Cari nama staff..."
						value={searchTerm()}
						onInput={(e) => setSearchTerm(e.currentTarget.value)}
						class="w-full bg-card border-border/60 border-2 rounded-2xl h-12 pl-12 pr-4 font-bold text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
					/>
				</div>

				{/* Staff List */}
				<div class="space-y-3">
					<Show
						when={staffs() && staffs()!.length > 0}
						fallback={
							<div class="text-center py-20 px-10">
								<div class="w-20 h-20 bg-muted rounded-[32px] flex items-center justify-center mx-auto mb-4 border-4 border-background shadow-inner">
									<UserIcon
										size={32}
										class="text-muted-foreground/40"
									/>
								</div>
								<h2 class="font-black text-lg mb-1">
									Pintu Belum Terbuka
								</h2>
								<p class="text-sm text-muted-foreground font-semibold">
									Belum ada staff yang terdaftar. Tambahkan staff
									pertama Anda untuk mulai mengelola outlet.
								</p>
							</div>
						}
					>
						<For each={filteredStaff()}>
							{(staff) => (
								<div
									onClick={() => handleOpenModal(staff)}
									class={`bg-card rounded-[28px] border-2 transition-all p-4 relative group cursor-pointer active:scale-[0.99] hover:bg-muted/10 ${staff.isActive ? "border-border/60" : "border-border/20 opacity-60"}`}
								>
									<div class="flex items-center gap-4">
										{/* Avatar */}
										<div
											class={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
												getRoleName(staff.roleId)
													.toLowerCase()
													.includes("admin")
													? "bg-indigo-500 text-white"
													: "bg-orange-500 text-white"
											}`}
										>
											{staff.name.charAt(0).toUpperCase()}
										</div>

										<div class="flex-1">
											<div class="flex items-center gap-2 mb-2">
												<h3 class="font-black text-base tracking-tight">
													{staff.name}
												</h3>
												<span
													class={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
														getRoleName(staff.roleId)
															.toLowerCase()
															.includes("admin")
															? "bg-indigo-500/10 text-indigo-500"
															: "bg-orange-500/10 text-orange-500"
													}`}
												>
													{getRoleName(staff.roleId)}
												</span>
											</div>
											<div class="flex flex-col gap-1.5 opacity-80">
												<div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
													<Key size={10} stroke-width={3} />
													<span class="opacity-60">PIN:</span>
													<span class="text-foreground tracking-[0.2em]">
														****
													</span>
												</div>
												<Show when={staff.email}>
													<div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
														<Mail size={10} stroke-width={3} />
														<span class="opacity-60">Email:</span>
														<span class="text-foreground truncate max-w-[120px]">
															{staff.email}
														</span>
													</div>
												</Show>
												<Show when={staff.phone}>
													<div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
														<Phone size={10} stroke-width={3} />
														<span class="opacity-60">Telp:</span>
														<span class="text-foreground">
															{staff.phone}
														</span>
													</div>
												</Show>
											</div>
										</div>

										<div class="flex items-center gap-1">
											<button
												onClick={(e) => {
													e.stopPropagation();
													deleteStaff(staff.id);
												}}
												class="p-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors"
												aria-label="Hapus Staff"
											>
												<Trash2 size={16} class="text-red-500" />
											</button>
										</div>
									</div>

									{/* Status Toggle */}
									<button
										onClick={(e) => {
											e.stopPropagation();
											toggleStatus(staff);
										}}
										class={`mt-4 w-full py-2.5 rounded-xl border-2 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
											staff.isActive
												? "bg-green-500/5 border-green-500/20 text-green-600"
												: "bg-red-500/5 border-red-500/10 text-red-500"
										}`}
									>
										<Show
											when={staff.isActive}
											fallback={
												<>
													<CircleX size={14} /> Nonaktif
												</>
											}
										>
											<CircleCheck size={14} /> Aktif
										</Show>
									</button>
								</div>
							)}
						</For>
					</Show>
				</div>
			</div>

			<Show when={isModalOpen()}>
				<div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
					<button
						type="button"
						class="absolute inset-0 bg-black/60 backdrop-blur-sm border-none w-full h-full cursor-default"
						onClick={() => setIsModalOpen(false)}
						aria-label="Tutup Modal"
						tabIndex={-1}
					/>
					<div class="relative w-full max-w-md bg-background rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
						<div class="p-6 pb-10 sm:pb-6">
							<div class="flex items-center justify-between mb-8">
								<div>
									<h2 class="text-2xl font-black tracking-tight">
										{editingStaff() ? "Edit Staff" : "Tambah Staff"}
									</h2>
									<p class="text-sm text-muted-foreground font-semibold">
										Kelola data akses karyawan outlet Anda.
									</p>
								</div>
								<div
									class={`w-12 h-12 rounded-2xl flex items-center justify-center ${editingStaff() ? "bg-indigo-500/10 text-indigo-500" : "bg-primary/10 text-primary"}`}
								>
									<UserPlus size={24} />
								</div>
							</div>

							<form onSubmit={handleSubmit} class="space-y-5">
								<div class="space-y-2">
									<label class="flex flex-col gap-2">
										<span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
											<UserIcon size={10} /> Nama Lengkap Staff
										</span>
										<input
											type="text"
											required
											placeholder="Contoh: Budi Santoso"
											value={name()}
											onInput={(e) => setName(e.currentTarget.value)}
											class="w-full bg-muted/20 border-border/80 border-2 rounded-2xl h-14 px-5 font-black text-base focus:outline-none focus:border-primary/50 transition-all"
										/>
									</label>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-2">
										<label class="flex flex-col gap-2">
											<span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
												<Shield size={10} /> Jabatan
											</span>
											<div class="relative">
												<select
													value={roleId()}
													onInput={(e) =>
														setRoleId(e.currentTarget.value)
													}
													class="w-full bg-muted/20 border-border/80 border-2 rounded-2xl h-14 px-5 font-black text-base appearance-none focus:outline-none focus:border-primary/50 transition-all pr-10"
												>
													<For each={roles()}>
														{(role) => (
															<option value={role.id}>
																{role.name}
															</option>
														)}
													</For>
												</select>
												<ChevronDown
													class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
													size={18}
												/>
											</div>
										</label>
									</div>

									<div class="space-y-2">
										<label class="flex flex-col gap-2">
											<span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
												<Key size={10} /> PIN Akses
											</span>
											<input
												type="password"
												maxLength={4}
												required
												placeholder="****"
												value={pin()}
												onInput={(e) => {
													const val =
														e.currentTarget.value.replaceAll(
															/\D/g,
															"",
														);
													setPin(val);
												}}
												class="w-full bg-muted/20 border-border/80 border-2 rounded-2xl h-14 px-4 font-black text-center text-xl tracking-[0.5em] focus:outline-none focus:border-primary/50 transition-all placeholder:tracking-normal placeholder:font-bold"
											/>
										</label>
									</div>
								</div>

								<div class="space-y-2">
									<label class="flex flex-col gap-2">
										<span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
											<Phone size={10} /> No. Telepon
										</span>
										<input
											type="tel"
											placeholder="0812xxxx"
											value={phone()}
											onInput={(e) =>
												setPhone(e.currentTarget.value)
											}
											class="w-full bg-muted/20 border-border/80 border-2 rounded-2xl h-14 px-5 font-black text-base focus:outline-none focus:border-primary/50 transition-all"
										/>
									</label>
								</div>

								<div class="space-y-2">
									<label class="flex flex-col gap-2">
										<span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
											<Mail size={10} /> Alamat Email (Opsional)
										</span>
										<input
											type="email"
											placeholder="staff@ngepos.id"
											value={email()}
											onInput={(e) =>
												setEmail(e.currentTarget.value)
											}
											class="w-full bg-muted/20 border-border/80 border-2 rounded-2xl h-14 px-5 font-black text-base focus:outline-none focus:border-primary/50 transition-all"
										/>
									</label>
								</div>

								<div class="flex gap-3 pt-4">
									<button
										type="button"
										onClick={() => setIsModalOpen(false)}
										class="flex-1 h-14 rounded-2xl font-black text-sm bg-muted/50 text-muted-foreground hover:bg-muted transition-all"
									>
										Batal
									</button>
									<button
										type="submit"
										class="flex-[2] h-14 rounded-2xl font-black text-sm bg-primary text-primary-foreground shadow-xl shadow-primary/20 active:scale-95 transition-all"
									>
										Simpan Data Staff
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
