import type { User } from "../../db/schema.js";
import type { OrganizationMembershipRole } from "../../db/schema.js";
import type { RegisterUserResponse } from "../auth/auth.types.js";

export function toRegisterUserResponse(
  user: User,
  activeOrganizationId?: string,
  role?: OrganizationMembershipRole,
): RegisterUserResponse {
  return {
    id: user.id,
    email: user.email,
    role,
    createdAt: user.createdAt,
    isSuperadmin: user.isSuperadmin,
    activeOrganizationId,
  };
}
