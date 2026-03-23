import { NewUser } from "../../db/schema.js";
import {
  LoginUserResponse,
  RefreshTokenResponse,
  RegisterUserResponse,
} from "./auth.types.js";

export function toRegisterUserResponse(user: NewUser): RegisterUserResponse {
  return {
    id: user.id as string,
    email: user.email,
    createdAt: user.createdAt as Date,
  };
}

export function toLoginUserResponse(
  user: NewUser,
  token: string,
  refreshToken: string,
): LoginUserResponse {
  return {
    id: user.id as string,
    email: user.email,
    createdAt: user.createdAt as Date,
    token: token,
    refreshToken: refreshToken,
  };
}

export function toRefreshTokenResponse(token: string): RefreshTokenResponse {
  return {
    token: token,
  };
}
