import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { toast } from "solid-toast";
import { Store, Mail, ArrowRight, Loader2, ArrowLeft, MailCheck } from "lucide-solid";

export default function ForgotPassword() {
	const [email, setEmail] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [sent, setSent] = createSignal(false);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!email()) {
			toast.error("Silakan masukkan alamat email.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email() }),
			});

			const data = await res.json();

			if (res.ok) {
				setSent(true);
				toast.success("Link reset password telah dikirim ke email Anda.");
			} else {
				toast.error(data.error || "Gagal mengirim email reset password.");
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
			<div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
			<div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />

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
						Reset Password Akun
					</p>
				</div>

				{/* Form Container */}
				<div class="glass rounded-[2rem] p-8 premium-shadow border-border/60">
					<Show
						when={!sent()}
						fallback={
							<div class="text-center space-y-4">
								<div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
									<MailCheck size={28} class="text-emerald-600" />
								</div>
								<h2 class="text-lg font-bold text-foreground">Email Terkirim!</h2>
								<p class="text-sm text-muted-foreground leading-relaxed">
									Jika email <span class="font-bold text-foreground">{email()}</span> terdaftar di sistem kami, Anda akan menerima link reset password dalam beberapa menit.
								</p>
								<p class="text-xs text-muted-foreground">
									Link reset password berlaku selama 1 jam.
								</p>
								<A
									href="/login"
									class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors mt-4"
								>
									<ArrowLeft size={16} />
									Kembali ke Login
								</A>
							</div>
						}
					>
						<form onSubmit={handleSubmit} class="space-y-6">
							<p class="text-sm text-muted-foreground text-center leading-relaxed">
								Masukkan alamat email akun Anda. Kami akan mengirimkan link untuk mereset password Anda.
							</p>

							{/* Email Input */}
							<div class="space-y-2">
								<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
									Email Address
								</label>
								<div class="relative group">
									<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
										<Mail size={18} />
									</div>
									<input
										type="email"
										value={email()}
										onInput={(e) => setEmail(e.currentTarget.value)}
										placeholder="owner@ngepos.id"
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
									Kirim Link Reset
									<ArrowRight size={18} />
								</Show>
							</button>
						</form>
					</Show>
				</div>

				{/* Footer Links */}
				<div class="mt-8 flex flex-col items-center gap-6">
					<Show when={!sent()}>
						<p class="text-xs text-muted-foreground font-bold">
							Ingat password Anda?
							<A href="/login" class="text-secondary hover:underline ml-2 transition-colors">
								Masuk Disini
							</A>
						</p>
					</Show>

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
