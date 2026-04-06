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
  const showStudentsAndLessons =
    role === "org_admin" ||
    role === "tutor" ||
    role === "parent" ||
    isSuperadmin;

  return (
    <nav style={{ display: "flex", gap: 16, fontSize: 14, padding: "8px 0" }}>
      <Link href={base}>Home</Link>
      {showStudentsAndLessons ? (
        <Link href={`${base}/students`}>Students</Link>
      ) : null}
      {showStudentsAndLessons ? (
        <Link href={`${base}/lessons`}>Lessons</Link>
      ) : null}
      {role === "org_admin" || isSuperadmin ? (
        <Link href={`${base}/invites`}>Invites</Link>
      ) : null}
      {role === "org_admin" || isSuperadmin ? (
        <Link href={`${base}/organization`}>Members</Link>
      ) : null}
    </nav>
  );
}
