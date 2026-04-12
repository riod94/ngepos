import { createSignal, Show, createEffect } from "solid-js";
import { ArrowLeft, User, LogOut, Mail, Phone, Calendar, Shield, Save, Loader2, Key, Lock, Eye, EyeOff } from "lucide-solid";
import { useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/stores/auth";
import { toast } from "solid-toast";

export default function ProfilePage() {
	const navigate = useNavigate();
	const { currentUser, logout, updateProfile, changePassword } = useAuth();
	
	const [name, setName] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [phone, setPhone] = createSignal("");
	const [isSaving, setIsSaving] = createSignal(false);

	// Password change states
	const [oldPassword, setOldPassword] = createSignal("");
	const [newPassword, setNewPassword] = createSignal("");
	const [confirmPassword, setConfirmPassword] = createSignal("");
	const [isChangingPassword, setIsChangingPassword] = createSignal(false);
	const [showPasswords, setShowPasswords] = createSignal(false);

	// Sync local state when currentUser changes
	createEffect(() => {
		const user = currentUser();
		if (user) {
			setName(user.name || "");
			setEmail(user.email || "");
			setPhone(user.phone || "");
		}
	});

	const formatDate = (date: Date | string | null | undefined) => {
		if (!date) return "N/A";
		return new Date(date).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	};

	const handleLogout = () => {
		if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
			logout();
			navigate("/login", { replace: true });
		}
	};

	const handleSave = async () => {
		if (!name() || !email()) {
			toast.error("Nama dan Email tidak boleh kosong");
			return;
		}

		setIsSaving(true);
		const res = await updateProfile(name(), email(), phone());
		setIsSaving(false);

		if (res.success) {
			toast.success("Profil berhasil diperbarui");
		} else {
			toast.error(res.error || "Gagal memperbarui profil");
		}
	};

	const handlePasswordUpdate = async (e: Event) => {
		e.preventDefault();
		if (!oldPassword() || !newPassword() || !confirmPassword()) {
			toast.error("Semua field password wajib diisi");
			return;
		}

		if (newPassword() !== confirmPassword()) {
			toast.error("Konfirmasi password baru tidak cocok");
			return;
		}

		if (newPassword().length < 6) {
			toast.error("Password baru minimal 6 karakter");
			return;
		}

		setIsChangingPassword(true);
		const res = await changePassword(oldPassword(), newPassword());
		setIsChangingPassword(false);

		if (res.success) {
			toast.success("Password berhasil diperbarui");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} else {
			toast.error(res.error || "Gagal memperbarui password");
		}
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-32 font-jakarta">
			{/* Header */}
			<div class="flex items-center gap-3 px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<button
					onClick={() => navigate(-1)}
					class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
				>
					<ArrowLeft size={18} />
				</button>
				<div class="flex-1">
					<h1 class="font-black text-lg tracking-tight leading-none">Profil Saya</h1>
					<span class="text-xs font-bold text-muted-foreground mt-1 block uppercase tracking-widest leading-none">
						Pengaturan Akun
					</span>
				</div>
				<Button 
					onClick={handleSave} 
					disabled={isSaving()}
					size="sm"
					class="rounded-full px-4 h-9 font-black uppercase text-[10px] tracking-widest gap-2"
				>
					<Show when={!isSaving()} fallback={<Loader2 size={14} class="animate-spin" />}>
						<Save size={14} /> SIMPAN
					</Show>
				</Button>
			</div>

			<div class="p-5 flex flex-col gap-8">
				{/* User Card */}
				<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
					<div class="absolute top-0 left-0 w-full h-1.5 bg-primary/20" />
					<div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 border-2 border-primary/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
						<User size={40} stroke-width={1.5} />
					</div>
					<input 
						type="text"
						value={name()}
						onInput={e => setName(e.currentTarget.value)}
						class="font-black text-xl tracking-tight leading-none text-center bg-transparent border-none outline-none focus:ring-0 w-full"
						placeholder="Nama Pengguna"
					/>
					<p class="text-sm font-bold text-muted-foreground mt-3 bg-muted/50 px-4 py-1.5 rounded-full uppercase tracking-tighter shrink-0 border border-border/30 flex items-center gap-2 self-center">
						<Shield size={14} class="text-primary" />
						{currentUser()?.role?.name ?? "Staff"}
					</p>
				</div>

				{/* Account Details */}
				<div class="flex flex-col gap-2">
					<h3 class="px-2 text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Data Akun</h3>
					
					<div class="bg-card rounded-[24px] border border-border/70 shadow-sm overflow-hidden divide-y divide-border/40">
						<div class="flex items-center gap-4 p-4">
							<div class="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
								<Mail size={18} />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Email</p>
								<input 
									type="email"
									value={email()}
									onInput={e => setEmail(e.currentTarget.value)}
									class="font-bold text-sm w-full bg-transparent border-none outline-none focus:ring-0 p-0"
									placeholder="email@contoh.com"
								/>
							</div>
						</div>

						<div class="flex items-center gap-4 p-4">
							<div class="w-10 h-10 rounded-xl bg-orange-100/50 text-orange-600 flex items-center justify-center shrink-0">
								<Phone size={18} />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Telepon</p>
								<input 
									type="tel"
									value={phone()}
									onInput={e => setPhone(e.currentTarget.value)}
									class="font-bold text-sm w-full bg-transparent border-none outline-none focus:ring-0 p-0"
									placeholder="No Telepon"
								/>
							</div>
						</div>

						<div class="flex items-center gap-4 p-4">
							<div class="w-10 h-10 rounded-xl bg-teal-100/50 text-teal-600 flex items-center justify-center shrink-0">
								<Calendar size={18} />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Terdaftar Sejak</p>
								<p class="font-bold text-sm truncate opacity-60 italic">{formatDate(currentUser()?.createdAt)}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Security Section */}
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between px-2 mb-1">
						<h3 class="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Keamanan & Password</h3>
						<button 
							onClick={() => setShowPasswords(!showPasswords())}
							class="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1"
						>
							<Show when={showPasswords()} fallback={<><Eye size={12} /> Tampilkan</>}>
								<EyeOff size={12} /> Sembunyikan
							</Show>
						</button>
					</div>
					
					<div class="bg-card rounded-[24px] border border-border/70 shadow-sm p-4 space-y-4">
						<div class="space-y-3">
							<div class="relative">
								<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
									<Key size={16} />
								</div>
								<input 
									type={showPasswords() ? "text" : "password"}
									value={oldPassword()}
									onInput={e => setOldPassword(e.currentTarget.value)}
									placeholder="Password Saat Ini"
									class="w-full h-12 pl-12 pr-4 bg-muted/20 border border-border/50 rounded-xl text-sm font-bold focus:border-primary/50 outline-none transition-all"
								/>
							</div>
							<div class="relative">
								<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
									<Lock size={16} />
								</div>
								<input 
									type={showPasswords() ? "text" : "password"}
									value={newPassword()}
									onInput={e => setNewPassword(e.currentTarget.value)}
									placeholder="Password Baru"
									class="w-full h-12 pl-12 pr-4 bg-muted/20 border border-border/50 rounded-xl text-sm font-bold focus:border-primary/50 outline-none transition-all"
								/>
							</div>
							<div class="relative">
								<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
									<Shield size={16} />
								</div>
								<input 
									type={showPasswords() ? "text" : "password"}
									value={confirmPassword()}
									onInput={e => setConfirmPassword(e.currentTarget.value)}
									placeholder="Konfirmasi Password Baru"
									class="w-full h-12 pl-12 pr-4 bg-muted/20 border border-border/50 rounded-xl text-sm font-bold focus:border-primary/50 outline-none transition-all"
								/>
							</div>
						</div>
						
						<Button 
							onClick={handlePasswordUpdate}
							disabled={isChangingPassword() || !oldPassword() || !newPassword()}
							variant="secondary"
							class="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-none transition-all"
						>
							<Show when={!isChangingPassword()} fallback={<Loader2 size={16} class="animate-spin" />}>
								Perbarui Password
							</Show>
						</Button>
					</div>
				</div>

				{/* Actions */}
				<div class="flex flex-col gap-3">
					<Button 
						variant="outline" 
						class="h-14 rounded-2xl border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-500 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
						onClick={handleLogout}
					>
						<LogOut size={18} /> Keluar Aplikasi
					</Button>
					
					<p class="text-[10px] text-center font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mt-4">
						Versi Aplikasi 3.0.0-beta
					</p>
				</div>
			</div>
		</div>
	);
}
