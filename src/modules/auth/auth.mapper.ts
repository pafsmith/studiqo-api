import type { User } from "../../db/schema.js";
import type { OrganizationMembershipRole } from "../../db/schema.js";
import { LoginUserResponse, RefreshTokenResponse } from "./auth.types.js";

export { toRegisterUserResponse } from "../users/users.mapper.js";

export function toLoginUserResponse(
  user: User,
  token: string,
  refreshToken: string,
  activeOrganizationId?: string,
  role?: OrganizationMembershipRole,
): LoginUserResponse {
  return {
    id: user.id,
    email: user.email,
    role,
    createdAt: user.createdAt,
    isSuperadmin: user.isSuperadmin,
    activeOrganizationId,
    token: token,
    refreshToken: refreshToken,
  };
}

export function toRefreshTokenResponse(
  token: string,
  refreshToken?: string,
): RefreshTokenResponse {
  return {
    token: token,
    refreshToken: refreshToken,
  };
}
