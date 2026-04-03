import type { Organization, OrganizationInvitation, User } from "../../db/schema.js";
import { toLoginUserResponse } from "../auth/auth.mapper.js";
import type {
  AcceptInvitationResponse,
  InvitationDetailsResponse,
} from "./invitations.types.js";

export function toInvitationDetailsResponse(
  invitation: OrganizationInvitation,
  organization: Organization,
): InvitationDetailsResponse {
  return {
    organizationId: invitation.organizationId,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  };
}

export function toAcceptInvitationResponse(
  user: User,
  token: string,
  refreshToken: string,
  organizationId: string,
  role: OrganizationInvitation["role"],
): AcceptInvitationResponse {
  return toLoginUserResponse(user, token, refreshToken, organizationId, role);
}
