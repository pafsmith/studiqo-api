import type { OrganizationMembershipRole } from "../../db/schema.js";
import type { LoginUserResponse } from "../auth/auth.types.js";

export type InvitationDetailsResponse = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  email: string;
  role: OrganizationMembershipRole;
  expiresAt: Date;
};

export type AcceptInvitationRequest = {
  password: string;
};

export type AcceptInvitationResponse = LoginUserResponse;
