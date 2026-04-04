import { getAppSubdomain } from "@/lib/env";

/** Hostname labels that cannot be organization tenant slugs. */
export function isReservedTenantLabel(label: string): boolean {
  const l = label.toLowerCase();
  if (l === "www" || l === "api") return true;
  if (l === getAppSubdomain()) return true;
  return false;
}
