"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { appShellUrl } from "@/lib/urls";

export function AppShellHeader() {
  const pathname = usePathname() ?? "";
  const { user, authStatus, logout } = useSession();
  const authed = authStatus === "authenticated";
  const loading = authStatus === "loading";

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-6 py-4 md:items-center md:px-8">
      <div className="flex flex-wrap items-center gap-5">
        <Link href="/" className="app-brand-link font-serif-display">
          Studiqo
        </Link>
        <nav aria-label="App">
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            <li className="m-0">
              <Link
                href="/onboarding"
                className="app-nav-link app-nav-link--on-surface"
                aria-current={
                  pathname === "/onboarding" || pathname.startsWith("/onboarding/")
                    ? "page"
                    : undefined
                }
              >
                Organizations
              </Link>
            </li>
            {loading ? null : authed ? null : (
              <>
                <li className="m-0">
                  <Link
                    href="/login"
                    className="app-nav-link app-nav-link--on-surface"
                    aria-current={pathname === "/login" ? "page" : undefined}
                  >
                    Log in
                  </Link>
                </li>
                <li className="m-0">
                  <Link
                    href="/register"
                    className="app-nav-link app-nav-link--on-surface"
                    aria-current={pathname === "/register" ? "page" : undefined}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
      {loading ? (
        <span className="text-[0.8125rem] text-ink-faint">Session…</span>
      ) : authed ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm leading-snug text-ink-muted">
            {user?.email ?? "—"}
            {user?.role ? ` · ${user.role}` : null}
            {user?.isSuperadmin ? " · superadmin" : null}
          </span>
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
      ) : null}
    </header>
  );
}
