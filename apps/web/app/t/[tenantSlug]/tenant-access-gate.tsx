"use client";

import { useEffect, useMemo, useState } from "react";

import {
  useOrganizationsQuery,
  useSetActiveOrganizationMutation,
} from "@/lib/api/organizations-query";
import { useSession } from "@/lib/auth/session";
import { appShellUrl } from "@/lib/urls";

export function TenantAccessGate({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const { authStatus, user } = useSession();
  const { data: orgs, isLoading: orgsLoading } = useOrganizationsQuery();
  const setActiveOrg = useSetActiveOrganizationMutation();
  const [orgSyncFailed, setOrgSyncFailed] = useState(false);

  const organizationId = useMemo(
    () => orgs?.find((o) => o.slug === tenantSlug)?.id ?? null,
    [orgs, tenantSlug],
  );

  useEffect(() => {
    setOrgSyncFailed(false);
  }, [tenantSlug]);

  useEffect(() => {
    if (authStatus !== "unauthenticated") return;
    const returnUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const q = returnUrl
      ? `?returnUrl=${encodeURIComponent(returnUrl)}`
      : "";
    window.location.href = appShellUrl(`/login${q}`);
  }, [authStatus]);

  useEffect(() => {
    if (
      authStatus !== "authenticated" ||
      !organizationId ||
      orgSyncFailed ||
      user?.activeOrganizationId === organizationId
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await setActiveOrg.mutateAsync(organizationId);
      } catch {
        if (!cancelled) setOrgSyncFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    authStatus,
    organizationId,
    user?.activeOrganizationId,
    orgSyncFailed,
    setActiveOrg,
  ]);

  if (authStatus === "loading") {
    return <p style={{ padding: 24 }}>Loading session…</p>;
  }

  if (authStatus === "unauthenticated") {
    return <p style={{ padding: 24 }}>Redirecting to log in…</p>;
  }

  if (orgsLoading) {
    return <p style={{ padding: 24 }}>Loading workspace…</p>;
  }

  const list = orgs ?? [];
  const allowed =
    user?.isSuperadmin === true ||
    list.some((o) => o.slug === tenantSlug);

  if (!allowed) {
    return (
      <main style={{ padding: 24, maxWidth: 480 }}>
        <h1>Workspace not found</h1>
        <p>You do not have access to this organization.</p>
        <p>
          <a href={appShellUrl("/onboarding")}>Manage organizations</a>
        </p>
      </main>
    );
  }

  if (orgSyncFailed) {
    return (
      <main style={{ padding: 24, maxWidth: 480 }}>
        <h1>Could not open workspace</h1>
        <p>We could not switch your active organization to this tenant.</p>
        <p>
          <a href={appShellUrl("/onboarding")}>Manage organizations</a>
        </p>
      </main>
    );
  }

  const needsOrgSync =
    Boolean(organizationId) &&
    user?.activeOrganizationId !== organizationId;

  if (needsOrgSync || setActiveOrg.isPending) {
    return <p style={{ padding: 24 }}>Switching to this organization…</p>;
  }

  return children;
}
