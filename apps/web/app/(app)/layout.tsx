import type { ReactNode } from "react";

import { AppShellHeader } from "@/components/app-shell-header";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppShellHeader />
      {children}
    </div>
  );
}
