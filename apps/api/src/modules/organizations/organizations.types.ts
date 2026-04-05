import type { OrganizationMembershipRole } from "../../db/schema.js";

export type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
};

export type CreateOrganizationRequest = {
  name: string;
  slug: string;
};

export type OrganizationMembershipResponse = {
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
  createdAt: Date;
  /** User's account email (used as display label; users have no separate legal name field). */
  email: string;
};

export type AddOrganizationMemberRequest = {
  userId: string;
  role: OrganizationMembershipRole;
};

export type CreateOrganizationInvitationRequest = {
  email: string;
};

export type OrganizationInvitationResponse = {
  id: string;
  organizationId: string;
  invitedByUserId: string | null;
  email: string;
  role: OrganizationMembershipRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
};
