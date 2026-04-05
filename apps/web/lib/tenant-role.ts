import type { components } from "@studiqo/api-client/generated";

export type OrgRole = components["schemas"]["OrganizationMembershipRole"];

export function isOrgAdminOrSuperadmin(
  role: OrgRole | undefined,
  isSuperadmin: boolean,
): boolean {
  return role === "org_admin" || isSuperadmin;
}
