import type { OrganizationMembershipRole, User } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` middleware on protected routes. */
      user?: User;
      /** Active organization context resolved during authentication. */
      organizationId?: string;
      /** Membership role for the active organization (undefined for superadmin without membership). */
      organizationRole?: OrganizationMembershipRole;
    }
  }
}

export {};
