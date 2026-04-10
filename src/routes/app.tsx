import { JSX } from "solid-js";
import { TopNav } from "~/components/TopNav";
import { BottomNav } from "~/components/BottomNav";

interface AppLayoutProps {
  readonly children: JSX.Element;
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-16 print:pb-0 print:bg-white print:min-h-0">
      <TopNav />
      <main class="flex-1 w-full max-w-lg mx-auto relative cursor-default">
        {props.children}
      </main>
      <BottomNav />
    </div>
  );
}
