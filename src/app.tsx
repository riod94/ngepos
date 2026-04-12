import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount } from "solid-js";
import { Toaster } from "solid-toast";
import { seedDatabase } from "~/db/db";
import "./app.css";

const LoadingScreen = () => (
  <div class="min-h-screen w-full bg-background flex flex-col items-center justify-center gap-6 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none" />
    <img
      src="/logo_wordmark.png"
      alt="NgePos"
      class="h-12 object-contain relative z-10 animate-[fadeIn_0.4s_ease-out]"
    />
    <div class="flex items-center gap-2 relative z-10">
      <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
      <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
      <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
    </div>
  </div>
);

export default function App() {
  onMount(() => {
    seedDatabase().catch(console.error);
  });

  return (
    <Router
      root={props => (
        <Suspense fallback={<LoadingScreen />}>
          {props.children}
          <Toaster position="top-right" gutter={8} />
        </Suspense>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
