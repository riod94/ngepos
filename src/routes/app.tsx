import { JSX, createEffect, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TopNav } from "~/components/TopNav";
import { BottomNav } from "~/components/BottomNav";
import { useAuth } from "~/stores/auth";
import { Store } from "lucide-solid";

interface AppLayoutProps {
	readonly children: JSX.Element;
}

export default function AppLayout(props: AppLayoutProps) {
	const { currentUser, isAuthChecking, initAuth } = useAuth();
	const navigate = useNavigate();

	createEffect(async () => {
		await initAuth();
		if (!isAuthChecking() && !currentUser()) {
			navigate("/login", { replace: true });
		}
	});

	return (
		<Show
			when={!isAuthChecking()}
			fallback={
				<div class="flex flex-col items-center justify-center min-h-screen bg-background">
					<div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary animate-pulse mb-4">
						<Store size={32} />
					</div>
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
						<div class="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
						<div class="w-2 h-2 bg-primary rounded-full animate-bounce" />
					</div>
				</div>
			}
		>
			<Show when={currentUser()}>
				<div class="flex flex-col min-h-screen bg-muted/10 pb-16 print:pb-0 print:bg-white print:min-h-0">
					<TopNav />
					<main class="flex-1 w-full max-w-lg mx-auto relative cursor-default">
						{props.children}
					</main>
					<BottomNav />
				</div>
			</Show>
		</Show>
	);
}
