"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth/session";
import { appShellUrl } from "@/lib/urls";

function navActive(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function AppShellHeader() {
  const pathname = usePathname() ?? "";
  const { user, authStatus, logout } = useSession();
  const authed = authStatus === "authenticated";
  const loading = authStatus === "loading";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-background px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center gap-1 md:gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="font-serif-display px-2 text-lg font-semibold tracking-tight"
        >
          <Link href="/">Studiqo</Link>
        </Button>
        <Separator orientation="vertical" className="hidden h-6 md:block" />
        <nav className="flex flex-wrap items-center gap-1" aria-label="App">
          <Button
            variant={
              navActive(pathname, "/onboarding") ? "secondary" : "ghost"
            }
            size="sm"
            asChild
          >
            <Link
              href="/onboarding"
              aria-current={
                navActive(pathname, "/onboarding") ? "page" : undefined
              }
            >
              Organizations
            </Link>
          </Button>
          {loading ? null : !authed ? (
            <>
              <Button
                variant={pathname === "/login" ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link
                  href="/login"
                  aria-current={pathname === "/login" ? "page" : undefined}
                >
                  Log in
                </Link>
              </Button>
              <Button
                variant={pathname === "/register" ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link
                  href="/register"
                  aria-current={
                    pathname === "/register" ? "page" : undefined
                  }
                >
                  Register
                </Link>
              </Button>
            </>
          ) : null}
        </nav>
      </div>
      {loading ? (
        <span className="text-xs text-muted-foreground">Session…</span>
      ) : authed ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm leading-snug text-muted-foreground">
            {user?.email ?? "—"}
            {user?.role ? ` · ${user.role}` : null}
            {user?.isSuperadmin ? " · superadmin" : null}
          </span>
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
      ) : null}
    </header>
  );
}
