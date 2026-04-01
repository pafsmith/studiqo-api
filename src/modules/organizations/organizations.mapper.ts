import type { Organization, OrganizationMembership } from "../../db/schema.js";
import type {
  OrganizationMembershipResponse,
  OrganizationResponse,
} from "./organizations.types.js";

export function toOrganizationResponse(row: Organization): OrganizationResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
  };
}

export function toOrganizationMembershipResponse(
  row: OrganizationMembership,
): OrganizationMembershipResponse {
  return {
    organizationId: row.organizationId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt,
  };
}
