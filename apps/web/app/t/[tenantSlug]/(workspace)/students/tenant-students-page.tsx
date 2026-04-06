"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <main className="flex flex-col gap-4">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Students
        </h1>
        <Skeleton className="h-4 w-40" />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Students
        </h1>
        {canManage ? (
          <Button size="sm" asChild>
            <Link href={`${base}/new`}>New student</Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full max-w-lg" />
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : "Could not load students"}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && students?.length === 0 ? (
        <div className="flex max-w-prose flex-col gap-3">
          <p className="m-0 text-sm text-muted-foreground">No students yet.</p>
          {canManage ? (
            <Button size="sm" asChild className="w-fit">
              <Link href={`${base}/new`}>Create the first student</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && students && students.length > 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col gap-0 px-0 py-0">
            {students.map((s) => (
              <div
                key={s.id}
                className="border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
              >
                <Link
                  href={`${base}/${s.id}`}
                  className="text-base font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {s.firstName} {s.lastName}
                </Link>
                <div className="mt-1 text-sm text-muted-foreground">
                  Born {formatIsoDate(s.dateOfBirth)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
