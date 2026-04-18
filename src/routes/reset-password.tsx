import { createSignal, onMount, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { toast } from "solid-toast";
import { Store, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-solid";

export default function ResetPassword() {
	const [searchParams] = useSearchParams();

	const [newPassword, setNewPassword] = createSignal("");
	const [confirmPassword, setConfirmPassword] = createSignal("");
	const [showPassword, setShowPassword] = createSignal(false);
	const [loading, setLoading] = createSignal(false);
	const [success, setSuccess] = createSignal(false);
	const [invalidToken, setInvalidToken] = createSignal(false);

	onMount(() => {
		if (!searchParams.token) {
			setInvalidToken(true);
		}
	});

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!newPassword() || !confirmPassword()) {
			toast.error("Silakan isi semua field.");
			return;
		}

		if (newPassword().length < 6) {
			toast.error("Password minimal 6 karakter.");
			return;
		}

		if (newPassword() !== confirmPassword()) {
			toast.error("Password dan konfirmasi tidak cocok.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: searchParams.token,
					newPassword: newPassword(),
				}),
			});

			const data = await res.json();

			if (res.ok) {
				setSuccess(true);
				toast.success("Password berhasil direset!");
			} else {
				toast.error(data.error || "Gagal mereset password.");
				if (data.error?.includes("kedaluwarsa") || data.error?.includes("tidak valid")) {
					setInvalidToken(true);
				}
			}
		} catch {
			toast.error("Terjadi kesalahan jaringan.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div class="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-jakarta">
			{/* Decorative elements */}
			<div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
			<div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />

			<div class="w-full max-w-[400px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
				{/* Brand Header */}
				<div class="flex flex-col items-center mb-8">
					<div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary premium-shadow mb-6 border border-primary/20">
						<Store size={32} />
					</div>
					<h1 class="text-3xl font-black tracking-tight text-foreground mb-1 italic">
						Ngepos
					</h1>
					<p class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
						Buat Password Baru
					</p>
				</div>

				{/* Form Container */}
				<div class="glass rounded-[2rem] p-8 premium-shadow border-border/60">
					<Show
						when={!invalidToken()}
						fallback={
							<div class="text-center space-y-4">
								<div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
									<XCircle size={28} class="text-red-500" />
								</div>
								<h2 class="text-lg font-bold text-foreground">Link Tidak Valid</h2>
								<p class="text-sm text-muted-foreground leading-relaxed">
									Link reset password tidak valid atau sudah kedaluwarsa. Silakan request link baru.
								</p>
								<A
									href="/forgot-password"
									class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors mt-4"
								>
									Request Link Baru
								</A>
							</div>
						}
					>
						<Show
							when={!success()}
							fallback={
								<div class="text-center space-y-4">
									<div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
										<CheckCircle2 size={28} class="text-emerald-600" />
									</div>
									<h2 class="text-lg font-bold text-foreground">Password Berhasil Direset!</h2>
									<p class="text-sm text-muted-foreground leading-relaxed">
										Password Anda telah berhasil diubah. Silakan login dengan password baru Anda.
									</p>
									<A
										href="/login"
										class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors mt-4"
									>
										Masuk Sekarang
										<ArrowRight size={16} />
									</A>
								</div>
							}
						>
							<form onSubmit={handleSubmit} class="space-y-6">
								<p class="text-sm text-muted-foreground text-center leading-relaxed">
									Buat password baru untuk akun Anda. Password minimal 6 karakter.
								</p>

								{/* New Password Input */}
								<div class="space-y-2">
									<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
										Password Baru
									</label>
									<div class="relative group">
										<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
											<Lock size={18} />
										</div>
										<input
											type={showPassword() ? "text" : "password"}
											value={newPassword()}
											onInput={(e) => setNewPassword(e.currentTarget.value)}
											placeholder="Min. 6 karakter"
											class="w-full h-14 bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-12 text-foreground font-semibold placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:bg-background transition-all"
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword())}
											class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
										>
											<Show when={showPassword()} fallback={<Eye size={18} />}>
												<EyeOff size={18} />
											</Show>
										</button>
									</div>
								</div>

								{/* Confirm Password Input */}
								<div class="space-y-2">
									<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
										Konfirmasi Password
									</label>
									<div class="relative group">
										<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
											<Lock size={18} />
										</div>
										<input
											type={showPassword() ? "text" : "password"}
											value={confirmPassword()}
											onInput={(e) => setConfirmPassword(e.currentTarget.value)}
											placeholder="Ulangi password baru"
											class="w-full h-14 bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:bg-background transition-all"
											required
										/>
									</div>
								</div>

								{/* Submit Button */}
								<button
									type="submit"
									disabled={loading()}
									class="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
								>
									<Show when={!loading()} fallback={<Loader2 size={20} class="animate-spin" />}>
										Reset Password
										<ArrowRight size={18} />
									</Show>
								</button>
							</form>
						</Show>
					</Show>
				</div>

				{/* Footer Links */}
				<div class="mt-8 flex flex-col items-center gap-6">
					<div class="flex items-center gap-3 opacity-30">
						<div class="h-[1px] w-8 bg-foreground" />
						<div class="text-[9px] font-black uppercase tracking-[0.3em] text-foreground">
							Offline First • Cloud Sync
						</div>
						<div class="h-[1px] w-8 bg-foreground" />
					</div>
				</div>
			</div>
		</div>
	);
}
