import { createSignal, onMount, Show } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { toast } from "solid-toast";
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-solid";
import { useAuth } from "~/stores/auth";

export default function Login() {
	const navigate = useNavigate();
	const { login, currentUser, initAuth } = useAuth();
	
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [showPassword, setShowPassword] = createSignal(false);
	const [loading, setLoading] = createSignal(false);

	onMount(async () => {
		await initAuth();
		if (currentUser()) {
			navigate("/app", { replace: true });
		}
	});

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!email() || !password()) {
			toast.error("Silakan isi email dan password.");
			return;
		}

		setLoading(true);
		const result = await login(email(), password());
		
		if (result.success) {
			toast.success(`Selamat datang kembali, ${currentUser()?.name}!`);
			navigate("/app", { replace: true });
		} else {
			if (result.requireVerification) {
				toast.error(result.error || "Email belum terverifikasi.");
				navigate(`/verify-email?email=${encodeURIComponent(email())}`);
			} else {
				toast.error(result.error || "Email atau Password salah.");
			}
		}
		setLoading(false);
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
						Akses Akun Profesional
					</p>
				</div>

				{/* Login Form Container */}
				<div class="glass rounded-[2rem] p-8 premium-shadow border-border/60">
					<form onSubmit={handleSubmit} class="space-y-6">
						{/* Email Input */}
						<div class="space-y-2">
							<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
								Email Toko
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
							<div class="flex justify-between items-center ml-1 pr-1">
								<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
									Password
								</label>
								<A href="#" class="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
									Lupa Password?
								</A>
							</div>
							<div class="relative group">
								<div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
									<Lock size={18} />
								</div>
								<input 
									type={showPassword() ? "text" : "password"}
									value={password()}
									onInput={e => setPassword(e.currentTarget.value)}
									placeholder="••••••••"
									class="w-full h-14 bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-12 text-foreground font-semibold placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:bg-background transition-all"
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

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading()}
							class="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
						>
							<Show when={!loading()} fallback={<Loader2 size={20} class="animate-spin" />}>
								Masuk Ke System
								<ArrowRight size={18} />
							</Show>
						</button>
					</form>
				</div>

				{/* Footer Links */}
				<div class="mt-8 flex flex-col items-center gap-6">
					<p class="text-xs text-muted-foreground font-bold">
						Belum punya akun personal? 
						<A href="/register" class="text-secondary hover:underline ml-2 transition-colors">
							Daftar Sekarang
						</A>
					</p>
					
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
