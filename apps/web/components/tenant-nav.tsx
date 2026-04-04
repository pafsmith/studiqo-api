"use client";

import Link from "next/link";

import type { components } from "@studiqo/api-client/generated";

type Role = components["schemas"]["OrganizationMembershipRole"] | undefined;

export function TenantNav({
  tenantSlug,
  role,
  isSuperadmin,
}: {
  tenantSlug: string;
  role: Role;
  isSuperadmin: boolean;
}) {
  const base = `/t/${tenantSlug}`;
  const showStaffLinks =
    role === "org_admin" || role === "tutor" || isSuperadmin;

  return (
    <nav style={{ display: "flex", gap: 16, fontSize: 14, padding: "8px 0" }}>
      <Link href={base}>Home</Link>
      {showStaffLinks ? (
        <span style={{ opacity: 0.5 }}>Students (Phase 2)</span>
      ) : null}
      {role === "org_admin" || isSuperadmin ? (
        <span style={{ opacity: 0.5 }}>Admin (Phase 4)</span>
      ) : null}
    </nav>
  );
}
