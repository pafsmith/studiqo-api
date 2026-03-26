import type { User } from "../../db/schema.js";
import { LoginUserResponse, RefreshTokenResponse } from "./auth.types.js";

export { toRegisterUserResponse } from "../users/users.mapper.js";

export function toLoginUserResponse(
  user: User,
  token: string,
  refreshToken: string,
): LoginUserResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    token: token,
    refreshToken: refreshToken,
  };
}

export function toRefreshTokenResponse(token: string): RefreshTokenResponse {
  return {
    token: token,
  };
}
