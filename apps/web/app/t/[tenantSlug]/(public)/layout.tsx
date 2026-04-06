import type { ReactNode } from "react";

/** Invitation flows are public (no session required). */
export default function TenantPublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
