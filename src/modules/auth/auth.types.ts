import type { UserRole } from "../../db/schema.js";

export interface RegisterUserRequest {
  email: string;
  password: string;
}

export interface RegisterUserResponse {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
}
