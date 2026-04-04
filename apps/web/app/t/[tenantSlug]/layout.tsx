import type { ReactNode } from "react";

/** Pass-through: workspace shell lives in `(workspace)`; public invite routes in `(public)`. */
export default function TenantRootLayout({ children }: { children: ReactNode }) {
  return children;
}
