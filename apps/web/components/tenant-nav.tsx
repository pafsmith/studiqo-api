"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <div className="border-b border-line bg-canvas px-6 md:px-8">
      <nav aria-label="Workspace">
        <ul className="m-0 flex list-none flex-wrap gap-1.5 px-0 py-3">
          {items.map(({ href, label }) => (
            <li key={href} className="m-0">
              <Link
                href={href}
                className="app-nav-link"
                aria-current={
                  pathMatchesNavItem(pathname, base, href) ? "page" : undefined
                }
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
