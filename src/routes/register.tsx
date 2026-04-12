import { createSignal, Show } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { toast } from "solid-toast";
import { Store, User, Mail, Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-solid";
import { useAuth } from "~/stores/auth";

export default function Register() {
	const navigate = useNavigate();
	const { register } = useAuth();
	
	const [name, setName] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [loading, setLoading] = createSignal(false);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!name() || !email() || !password()) {
			toast.error("Silakan lengkapi semua data.");
			return;
		}

		if (password().length < 6) {
			toast.error("Password minimal 6 karakter.");
			return;
		}

		setLoading(true);
		const result = await register(name(), email(), password());
		
		if (result.success) {
			toast.success(result.message || "Pendaftaran berhasil!");
			navigate(`/verify-email?email=${encodeURIComponent(email())}`);
		} else {
			toast.error(result.error || "Gagal mendaftar.");
		}
		setLoading(false);
	};

	return (
		<div class="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-jakarta">
			{/* Decorative elements */}
			<div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
			<div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />

			<div class="w-full max-w-[420px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
				{/* Brand Header */}
				<div class="flex flex-col items-center mb-8">
					<div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary premium-shadow mb-6 border border-primary/20">
						<Store size={32} />
					</div>
					<h1 class="text-3xl font-black tracking-tight text-foreground mb-1 italic">
						Join
						<span class="text-primary not-italic">Ngepos</span>
					</h1>
					<p class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
						Buat Akun Bisnis Anda
					</p>
				</div>

				{/* Register Form Container */}
				<div class="glass rounded-[2rem] p-8 premium-shadow border-border/60">
					<form onSubmit={handleSubmit} class="space-y-5">
						{/* Name Input */}
						<div class="space-y-2">
							<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
								Nama Lengkap
							</label>
							<div class="relative group">
								<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
									<User size={18} />
								</div>
								<input 
									type="text"
									value={name()}
									onInput={e => setName(e.currentTarget.value)}
									placeholder="Nama Anda"
									class="w-full h-14 bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:bg-background transition-all"
								/>
							</div>
						</div>

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
									onInput={e => setEmail(e.currentTarget.value)}
									placeholder="owner@ngepos.id"
									class="w-full h-14 bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:bg-background transition-all"
								/>
							</div>
						</div>

						{/* Password Input */}
						<div class="space-y-2">
							<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
								Password
							</label>
							<div class="relative group">
								<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
									<Lock size={18} />
								</div>
								<input 
									type="password"
									value={password()}
									onInput={e => setPassword(e.currentTarget.value)}
									placeholder="Min. 6 karakter"
									class="w-full h-14 bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:bg-background transition-all"
								/>
							</div>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading()}
							class="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all mt-4"
						>
							<Show when={!loading()} fallback={<Loader2 size={20} class="animate-spin" />}>
								Mulai Sekarang
								<ArrowRight size={18} />
							</Show>
						</button>
					</form>
				</div>

				<div class="mt-8 flex flex-col items-center gap-6">
					<div class="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100">
						<ShieldCheck size={14} />
						<span class="text-[9px] font-black uppercase tracking-widest">Sistem Keamanan Terjamin</span>
					</div>
					
					<p class="text-xs text-muted-foreground font-bold">
						Sudah punya akun? 
						<A href="/login" class="text-secondary hover:underline ml-2 transition-colors">
							Masuk Disini
						</A>
					</p>
				</div>
			</div>
		</div>
	);
}
