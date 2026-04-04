import type { ReactNode } from "react";

import { TenantAccessGate } from "../tenant-access-gate";
import { TenantChrome } from "../tenant-chrome";

export default async function TenantWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <TenantAccessGate tenantSlug={tenantSlug}>
      <TenantChrome tenantSlug={tenantSlug}>{children}</TenantChrome>
    </TenantAccessGate>
  );
}
