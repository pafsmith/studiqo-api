"use client";

import { TenantNav } from "@/components/tenant-nav";
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

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #e5e5e5",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 16 }}>{tenantSlug}</strong>
          <span style={{ fontSize: 13, opacity: 0.75 }}>
            {user?.email ?? "—"}
            {user?.role ? ` · ${user.role}` : null}
            {user?.isSuperadmin ? " · superadmin" : null}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href={appShellUrl("/onboarding")} style={{ fontSize: 14 }}>
            All organizations
          </a>
          <button
            type="button"
            style={{ padding: "8px 12px", fontSize: 14 }}
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
      <div style={{ padding: "0 20px" }}>
        <TenantNav
          tenantSlug={tenantSlug}
          role={user?.role}
          isSuperadmin={user?.isSuperadmin ?? false}
        />
      </div>
      <div style={{ padding: "16px 20px 32px" }}>{children}</div>
    </div>
  );
}
