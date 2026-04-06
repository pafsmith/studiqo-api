"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

import type { components } from "@studiqo/api-client/generated";

type Role = components["schemas"]["OrganizationMembershipRole"] | undefined;

function pathMatchesNavItem(pathname: string, base: string, href: string): boolean {
  if (href === base) {
    return pathname === base || pathname === `${base}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TenantNav({
  tenantSlug,
  role,
  isSuperadmin,
}: {
  tenantSlug: string;
  role: Role;
  isSuperadmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  const base = `/t/${tenantSlug}`;
  const showStudentsAndLessons =
    role === "org_admin" ||
    role === "tutor" ||
    role === "parent" ||
    isSuperadmin;

  const items: { href: string; label: string }[] = [{ href: base, label: "Home" }];
  if (showStudentsAndLessons) {
    items.push({ href: `${base}/students`, label: "Students" });
    items.push({ href: `${base}/lessons`, label: "Lessons" });
  }
  if (role === "org_admin" || isSuperadmin) {
    items.push({ href: `${base}/invites`, label: "Invites" });
    items.push({ href: `${base}/organization`, label: "Members" });
  }

  return (
    <div className="border-b bg-muted/40 px-4 md:px-6">
      <nav aria-label="Workspace">
        <ul className="m-0 flex list-none flex-wrap gap-1 px-0 py-2.5">
          {items.map(({ href, label }) => {
            const active = pathMatchesNavItem(pathname, base, href);
            return (
              <li key={href} className="m-0">
                <Button variant={active ? "secondary" : "ghost"} size="sm" asChild>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
