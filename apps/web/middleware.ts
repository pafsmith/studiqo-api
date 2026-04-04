import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isReservedTenantLabel } from "@/lib/tenant-reserved";

function hostnameNoPort(host: string | null): string {
  if (!host) return "";
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const host = hostnameNoPort(request.headers.get("host"));
  const rootDomain = (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "studiqo.io"
  ).toLowerCase();
  const appSub = (
    process.env.NEXT_PUBLIC_APP_SUBDOMAIN ?? "app"
  ).toLowerCase();

  const reqHeaders = new Headers(request.headers);

  if (process.env.NEXT_PUBLIC_TENANT_PATH_ROUTING === "true") {
    const m = pathname.match(/^\/t\/([^/]+)(\/.*)?$/);
    if (m) {
      const slug = m[1];
      let rest = m[2] ?? "/";
      if (rest.startsWith("/invite/")) {
        rest = `/invites/${rest.slice("/invite/".length)}`;
      }
      if (slug && !isReservedTenantLabel(slug)) {
        reqHeaders.set("x-tenant-slug", slug);
        const originalRest = m[2] ?? "/";
        if (rest !== originalRest) {
          const url = request.nextUrl.clone();
          url.pathname = `/t/${slug}${rest}`;
          return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
        }
        return NextResponse.next({ request: { headers: reqHeaders } });
      }
    }
    return NextResponse.next();
  }

  const isLocal = host === "localhost" || host === "127.0.0.1";

  if (!isLocal && host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, -(`.${rootDomain}`).length);
    if (sub && !isReservedTenantLabel(sub)) {
      reqHeaders.set("x-tenant-slug", sub);
      const url = request.nextUrl.clone();
      let internalPath = pathname;
      if (internalPath.startsWith("/invite/")) {
        internalPath = `/invites/${internalPath.slice("/invite/".length)}`;
      }
      url.pathname = `/t/${sub}${internalPath === "/" ? "" : internalPath}`;
      return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    }
  }

  if (host === `${appSub}.${rootDomain}` || host === rootDomain || isLocal) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
