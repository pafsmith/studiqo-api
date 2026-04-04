/** Public API base URL (includes `/api/v1`). See `apps/web/.env.example`. */
export function getPublicApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
  return raw.replace(/\/$/, "");
}

/** e.g. `studiqo.io` or `localhost` (no port). */
export function getRootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "studiqo.io").toLowerCase();
}

/** Subdomain for auth shell, default `app`. */
export function getAppSubdomain(): string {
  return (process.env.NEXT_PUBLIC_APP_SUBDOMAIN ?? "app").toLowerCase();
}

/** `https` or `http` — use `http` for local dev. */
export function getWebProtocol(): string {
  return (process.env.NEXT_PUBLIC_WEB_PROTOCOL ?? "https").replace(/:$/, "");
}

/** Optional port for tenant URLs, e.g. `3002` → `http://slug.localhost:3002`. */
export function getWebPortSuffix(): string {
  const p = process.env.NEXT_PUBLIC_WEB_PORT?.trim();
  if (!p) return "";
  return `:${p}`;
}

/** When `true`, tenant workspace is `/t/[slug]/…` on the app origin (single-host dev). */
export function isTenantPathRouting(): boolean {
  return process.env.NEXT_PUBLIC_TENANT_PATH_ROUTING === "true";
}

/**
 * Full origin for the app shell (login, onboarding), e.g. `http://localhost:3002`
 * or `http://app.localhost:3002`. Set in dev so tenant host can redirect here.
 */
export function getAppShellOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_SHELL_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const protocol = getWebProtocol();
  const root = getRootDomain();
  const appSub = getAppSubdomain();
  const port = getWebPortSuffix();
  if (root === "localhost" || root === "127.0.0.1") {
    return `${protocol}://localhost${port}`;
  }
  return `${protocol}://${appSub}.${root}${port}`;
}
