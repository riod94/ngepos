import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount } from "solid-js";
import { seedDatabase } from "~/db/db";
import "./app.css";

export default function App() {
  onMount(() => {
    // Eksekusi seeder db secara asinkron tanpa menahan UI (SolidJS Pattern)
    seedDatabase().catch(console.error);
  });

  return (
    <Router
      root={props => (
        <Suspense fallback={<div class="min-h-screen w-full flex items-center justify-center bg-background"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
          {props.children}
        </Suspense>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
