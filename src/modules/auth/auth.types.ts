import type { OrganizationMembershipRole } from "../../db/schema.js";

export interface RegisterUserRequest {
  email: string;
  password: string;
}

export interface RegisterUserResponse {
  id: string;
  email: string;
  role?: OrganizationMembershipRole;
  createdAt: Date;
  isSuperadmin: boolean;
  activeOrganizationId?: string;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  id: string;
  email: string;
  role?: OrganizationMembershipRole;
  createdAt: Date;
  isSuperadmin: boolean;
  activeOrganizationId?: string;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
}

export type RefreshTokenSource = "cookie" | "header";
