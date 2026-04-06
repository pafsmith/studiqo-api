"use client";

import { useMemo } from "react";

import { TenantNav } from "@/components/tenant-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b bg-background px-4 py-3 md:items-center md:px-6">
        <div>
          <p className="font-serif-display m-0 text-xl font-semibold leading-tight tracking-tight">
            {activeOrg?.name ?? tenantSlug}
          </p>
          {activeOrg ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {activeOrg.slug}
            </span>
          ) : null}
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground md:text-sm">
            {user?.email ?? "—"}
            {user?.role ? ` · ${user.role}` : null}
            {user?.isSuperadmin ? " · superadmin" : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={appShellUrl("/onboarding")}>All organizations</a>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void (async () => {
                await logout();
                window.location.href = appShellUrl("/login");
              })();
            }}
          >
            Log out
          </Button>
        </div>
      </header>
      <Separator />
      <TenantNav
        tenantSlug={tenantSlug}
        role={user?.role}
        isSuperadmin={user?.isSuperadmin ?? false}
      />
      <div className="px-4 py-4 pb-8 md:px-6 md:py-6 md:pb-10">{children}</div>
    </div>
  );
}
