import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount } from "solid-js";
import { seedDatabase } from "~/db/db";
import "./app.css";

export default function App() {
  onMount(() => {
    seedDatabase().catch(console.error);
  });

  return (
    <Router
      root={props => (
        <Suspense fallback={
          <div class="min-h-screen w-full bg-[#fdfaf7] relative overflow-hidden flex items-center justify-center">
            <div class="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-orange-400/5 opacity-50 blur-3xl"></div>
            <div class="w-12 h-12 border-4 border-muted/30 border-t-primary rounded-full animate-spin relative z-10 shadow-[0_0_20px_rgba(230,90,20,0.2)]"></div>
          </div>
        }>
          {props.children}
        </Suspense>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
