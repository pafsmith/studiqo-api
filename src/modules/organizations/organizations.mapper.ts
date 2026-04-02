import type {
  Organization,
  OrganizationInvitation,
  OrganizationMembership,
} from "../../db/schema.js";
import type {
  OrganizationInvitationResponse,
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

export function toOrganizationInvitationResponse(
  row: OrganizationInvitation,
): OrganizationInvitationResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    invitedByUserId: row.invitedByUserId,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
  };
}
