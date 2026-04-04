import type { ReactNode } from "react";

import { AppShellHeader } from "@/components/app-shell-header";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <AppShellHeader />
      {children}
    </div>
  );
}
