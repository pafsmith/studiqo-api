import {
  getAppShellOrigin,
  getAppSubdomain,
  getRootDomain,
  getWebPortSuffix,
  getWebProtocol,
  isTenantPathRouting,
} from "@/lib/env";

/** Login, register, onboarding — app shell origin + path. */
export function appShellUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const root = getRootDomain();
    const onTenantPath =
      isTenantPathRouting() && window.location.pathname.startsWith("/t/");
    const onTenantSubdomain =
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname.endsWith(`.${root}`) &&
      !hostname.startsWith(`${getAppSubdomain()}.`);
    if (onTenantPath || onTenantSubdomain) {
      return `${getAppShellOrigin()}${p}`;
    }
    return `${window.location.origin}${p}`;
  }
  return `${getAppShellOrigin()}${p}`;
}

/** Workspace entry for an organization slug (subdomain or `/t/slug`). */
export function tenantWorkspaceUrl(slug: string): string {
  const pathSlug = slug.replace(/^\/+|\/+$/g, "");
  if (isTenantPathRouting()) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : getAppShellOrigin();
    return `${origin}/t/${pathSlug}/`;
  }
  const protocol = getWebProtocol();
  const root = getRootDomain();
  const port = getWebPortSuffix();
  return `${protocol}://${pathSlug}.${root}${port}/`;
}
