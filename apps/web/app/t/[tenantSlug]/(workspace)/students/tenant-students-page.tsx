"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useStudentsListQuery } from "@/lib/api/students-query";
import { formatIsoDate } from "@/lib/datetime";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";

export function TenantStudentsPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const { data: students, isLoading, error } = useStudentsListQuery(
    organizationId,
  );

  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const base = `/t/${tenantSlug}/students`;

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Students</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Students</h1>
        {canManage ? (
          <Link href={`${base}/new`} style={{ fontSize: 15 }}>
            New student
          </Link>
        ) : null}
      </div>

      {isLoading ? <p>Loading students…</p> : null}
      {error ? (
        <p style={{ color: "#b91c1c" }}>
          {error instanceof Error ? error.message : "Could not load students"}
        </p>
      ) : null}

      {!isLoading && !error && students?.length === 0 ? (
        <p style={{ opacity: 0.85, marginTop: 16 }}>
          No students yet.
          {canManage ? (
            <>
              {" "}
              <Link href={`${base}/new`}>Create the first student</Link>.
            </>
          ) : null}
        </p>
      ) : null}

      {!isLoading && students && students.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
          {students.map((s) => (
            <li
              key={s.id}
              style={{
                borderBottom: "1px solid #eee",
                padding: "12px 0",
              }}
            >
              <Link
                href={`${base}/${s.id}`}
                style={{ fontSize: 16, fontWeight: 600 }}
              >
                {s.firstName} {s.lastName}
              </Link>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
                Born {formatIsoDate(s.dateOfBirth)}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
