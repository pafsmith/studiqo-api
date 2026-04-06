"use client";

import { useMemo } from "react";

import { TenantNav } from "@/components/tenant-nav";
import { useOrganizationsQuery } from "@/lib/api/organizations-query";
import { useSession } from "@/lib/auth/session";
import { appShellUrl } from "@/lib/urls";

export function TenantChrome({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const { user, logout } = useSession();
  const { data: orgs } = useOrganizationsQuery();
  const activeOrg = useMemo(
    () => orgs?.find((o) => o.slug === tenantSlug),
    [orgs, tenantSlug],
  );

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-6 py-4 md:items-center md:px-8">
        <div>
          <p className="font-serif-display m-0 text-xl font-semibold leading-tight tracking-tight">
            {activeOrg?.name ?? tenantSlug}
          </p>
          {activeOrg ? (
            <span className="mt-0.5 block text-xs leading-snug text-ink-faint">
              {activeOrg.slug}
            </span>
          ) : null}
          <p className="mt-1.5 text-[0.8125rem] leading-snug text-ink-muted">
            {user?.email ?? "—"}
            {user?.role ? ` · ${user.role}` : null}
            {user?.isSuperadmin ? " · superadmin" : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={appShellUrl("/onboarding")}
            className="app-nav-link app-nav-link--on-surface"
          >
            All organizations
          </a>
          <button
            type="button"
            className="app-btn app-btn-primary"
            onClick={() => {
              void (async () => {
                await logout();
                window.location.href = appShellUrl("/login");
              })();
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <TenantNav
        tenantSlug={tenantSlug}
        role={user?.role}
        isSuperadmin={user?.isSuperadmin ?? false}
      />
      <div className="px-6 py-4 pb-8 md:px-8 md:py-6 md:pb-10">{children}</div>
    </div>
  );
}
