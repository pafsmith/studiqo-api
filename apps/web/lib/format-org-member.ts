import type { components } from "@studiqo/api-client/generated";

type OrgMember = components["schemas"]["OrganizationMembership"];

/** User records only have email today; show email plus role in pickers. */
export function formatOrgMemberOptionLabel(m: OrgMember): string {
  const roleLabel =
    m.role === "org_admin"
      ? "Admin"
      : m.role === "tutor"
        ? "Tutor"
        : m.role === "parent"
          ? "Parent"
          : m.role;
  return `${m.email} (${roleLabel})`;
}
