import { createSignal, onMount, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { toast } from "solid-toast";
import { Store, KeyRound, Delete, LogIn } from "lucide-solid";
import { useAuth } from "~/stores/auth";
import { db } from "~/db/db";

export default function Login() {
	const navigate = useNavigate();
	const { login, currentUser, initAuth } = useAuth();
	const [pin, setPin] = createSignal("");
	const [loading, setLoading] = createSignal(false);
  const [outletName, setOutletName] = createSignal("Ngepos Cashier");

	onMount(async () => {
    const name = await db.settings.get("outlet_name");
    if (name?.value) setOutletName(name.value);

		await initAuth();
		if (currentUser()) {
			navigate("/app", { replace: true });
		}
	});

	const handleNumber = (num: string) => {
		if (pin().length < 4) {
			setPin(pin() + num);
		}
	};

	const handleDelete = () => {
		setPin(pin().slice(0, -1));
	};

	const handleSubmit = async () => {
		if (pin().length !== 4) return;
		setLoading(true);
		
		const success = await login(pin());
		if (success) {
			toast.success(`Selamat bekerja, ${currentUser()?.name}!`);
			navigate("/app", { replace: true });
		} else {
			toast.error("PIN Salah atau akun tidak aktif.");
			setPin("");
		}
		
		setLoading(false);
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 items-center justify-center p-4">
			<div class="w-full max-w-sm flex flex-col items-center">
				<div class="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-sm border border-primary/20">
					<Store size={40} />
				</div>
				
				<h1 class="text-2xl font-black tracking-tight text-center mb-1">
					{outletName()}
				</h1>
				<p class="text-sm font-semibold text-muted-foreground mb-8 text-center uppercase tracking-widest">
					Lock Screen
				</p>

				<div class="w-full bg-card rounded-[32px] shadow-xl border border-border/60 p-8 flex flex-col items-center">
					<div class="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-4">
						<KeyRound size={12} />
						Masukkan PIN Staff
					</div>
					
					{/* PIN Dots */}
					<div class="flex gap-4 mb-8">
						<For each={[0, 1, 2, 3]}>
							{(index) => (
								<div class={`w-5 h-5 rounded-full transition-all duration-300 ${pin().length > index ? "bg-primary scale-110 shadow-md shadow-primary/30" : "bg-muted/50 border border-border/60"}`} />
							)}
						</For>
					</div>

					{/* Number Pad */}
					<div class="grid grid-cols-3 gap-3 w-full max-w-[240px]">
						<For each={["1", "2", "3", "4", "5", "6", "7", "8", "9"]}>
							{(num) => (
								<button
									type="button"
									onClick={() => handleNumber(num)}
									class="h-16 rounded-2xl bg-muted/30 hover:bg-muted/60 active:scale-95 transition-all text-2xl font-black border border-border/50 text-foreground"
								>
									{num}
								</button>
							)}
						</For>
						<button
							type="button"
							onClick={handleDelete}
							class="h-16 rounded-2xl bg-muted/30 hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center border border-border/50 text-red-500"
						>
							<Delete size={24} />
						</button>
						<button
							type="button"
							onClick={() => handleNumber("0")}
							class="h-16 rounded-2xl bg-muted/30 hover:bg-muted/60 active:scale-95 transition-all text-2xl font-black border border-border/50 text-foreground"
						>
							0
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={pin().length !== 4 || loading()}
							class="h-16 rounded-2xl disabled:bg-muted/50 disabled:text-muted-foreground bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg active:scale-95 transition-all flex items-center justify-center border border-border/50"
						>
							<Show when={!loading()} fallback={<div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />}>
								<LogIn size={24} />
							</Show>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
