"use client";

import { useEffect } from "react";

import { useOrganizationsQuery } from "@/lib/api/organizations-query";
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

  useEffect(() => {
    if (authStatus !== "unauthenticated") return;
    const returnUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const q = returnUrl
      ? `?returnUrl=${encodeURIComponent(returnUrl)}`
      : "";
    window.location.href = appShellUrl(`/login${q}`);
  }, [authStatus]);

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

  return children;
}
