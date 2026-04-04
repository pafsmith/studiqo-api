"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth/session";
import { appShellUrl } from "@/lib/urls";

export function AppShellHeader() {
  const { user, authStatus, logout } = useSession();
  const authed = authStatus === "authenticated";
  const loading = authStatus === "loading";

  return (
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
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link
          href="/"
          style={{ fontWeight: 600, color: "#111", textDecoration: "none" }}
        >
          Studiqo
        </Link>
        <nav style={{ display: "flex", gap: 12, fontSize: 14 }}>
          <Link href="/onboarding">Organizations</Link>
          {loading ? null : authed ? null : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
      {loading ? (
        <span style={{ fontSize: 13, opacity: 0.6 }}>Session…</span>
      ) : authed ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <span style={{ opacity: 0.85 }}>
            {user?.email ?? "—"}
            {user?.role ? ` · ${user.role}` : null}
            {user?.isSuperadmin ? " · superadmin" : null}
          </span>
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
      ) : null}
    </header>
  );
}
