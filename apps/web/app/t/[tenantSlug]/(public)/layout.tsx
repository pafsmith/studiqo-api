import type { ReactNode } from "react";

/** Invitation flows are public (no session required). */
export default function TenantPublicLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>{children}</div>
  );
}
