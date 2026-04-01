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
};

export type AddOrganizationMemberRequest = {
  userId: string;
  role: OrganizationMembershipRole;
};
