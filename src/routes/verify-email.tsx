import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { useNavigate, useSearchParams, A } from "@solidjs/router";
import { toast } from "solid-toast";
import { Store, ShieldCheck, Loader2, Mail, RefreshCw } from "lucide-solid";
import { useAuth } from "~/stores/auth";

export default function VerifyEmail() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { verify, resendOtp } = useAuth();
	
	const [otp, setOtp] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [resending, setResending] = createSignal(false);
	const [countdown, setCountdown] = createSignal(0);

	const email = searchParams.email || "";

	onMount(() => {
		if (!email) {
			navigate("/login", { replace: true });
		}
	});

	// Timer logic
	let timer: any;
	
	onCleanup(() => {
		if (timer) clearInterval(timer);
	});
	const startTimer = (seconds: number) => {
		setCountdown(seconds);
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			setCountdown(prev => {
				if (prev <= 1) {
					clearInterval(timer);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (otp().length !== 6) {
			toast.error("Silakan masukkan 6-digit kode OTP.");
			return;
		}

		setLoading(true);
		const result = await verify(email, otp());
		
		if (result.success) {
			toast.success(result.message || "Email berhasil diverifikasi!");
			navigate("/login", { replace: true });
		} else {
			toast.error(result.error || "Gagal memverifikasi kode.");
		}
		setLoading(false);
	};

	const handleResend = async () => {
		if (countdown() > 0 || resending()) return;
		
		setResending(true);
		const result = await resendOtp(email);
		
		if (result.success) {
			toast.success(result.message || "Kode baru telah dikirim.");
			startTimer(60); // 60 seconds cooldown
		} else {
			toast.error(result.error || "Gagal mengirim ulang kode.");
		}
		setResending(false);
	};

	return (
		<div class="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-jakarta">
			{/* Decorative elements */}
			<div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
			<div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />

			<div class="w-full max-w-[420px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
				{/* Brand Header */}
				<div class="flex flex-col items-center mb-8 text-center">
					<div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary premium-shadow mb-6 border border-primary/20">
						<Mail size={32} />
					</div>
					<h1 class="text-3xl font-black tracking-tight text-foreground mb-1 italic">
						Verifikasi <span class="text-primary not-italic">Email</span>
					</h1>
					<p class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">
						Kami baru saja mengirim kode OTP ke:
						<span class="block text-primary mt-1 lowercase tracking-normal font-semibold truncate w-full">{email}</span>
					</p>
				</div>

				{/* OTP Form Container */}
				<div class="glass rounded-[2rem] p-8 premium-shadow border-border/60">
					<form onSubmit={handleSubmit} class="space-y-8">
						<div class="space-y-4">
							<div class="flex justify-center flex-col items-center gap-4">
								<input 
									type="text"
									maxLength={6}
									value={otp()}
									onInput={e => {
										const val = e.currentTarget.value.replace(/[^0-9]/g, '');
										setOtp(val);
									}}
									placeholder="000000"
									class="w-full h-20 bg-muted/30 border-2 border-border/60 rounded-2xl text-center text-4xl font-black tracking-[0.5em] text-foreground placeholder:text-muted-foreground/20 outline-none focus:border-primary/50 transition-all focus:bg-background"
								/>
								<div class="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-100">
									<span class="text-[9px] font-black uppercase tracking-widest leading-none">Berlaku 15 Menit</span>
								</div>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading() || otp().length !== 6}
							class="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
						>
							<Show when={!loading()} fallback={<Loader2 size={20} class="animate-spin" />}>
								Aktivasi Akun
								<ShieldCheck size={18} />
							</Show>
						</button>
					</form>
				</div>

				{/* Resend and Actions */}
				<div class="mt-8 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
					<button 
						onClick={handleResend}
						disabled={countdown() > 0 || resending()}
						class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Show when={!resending()} fallback={<Loader2 size={14} class="animate-spin" />}>
							<RefreshCw size={14} class={`${countdown() > 0 ? '' : 'group-hover:rotate-180'} transition-transform duration-700`} />
						</Show>
						<span class="text-[10px] font-black uppercase tracking-widest">
							{countdown() > 0 ? `Kirim Ulang (${countdown()}s)` : 'Kirim Ulang Kode'}
						</span>
					</button>

					<p class="text-xs text-muted-foreground font-bold">
						Salah memasukkan email? 
						<A href="/register" class="text-primary hover:underline ml-2 transition-colors">
							Ganti Email
						</A>
					</p>
				</div>
			</div>
		</div>
	);
}
