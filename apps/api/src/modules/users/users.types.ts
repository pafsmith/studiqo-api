import type { RegisterUserResponse } from "../auth/auth.types.js";
import type { OrganizationMembershipRole } from "../../db/schema.js";

export type UpdateUserRequest = {
  email?: string;
  role?: OrganizationMembershipRole;
};

export type UpdateUserResponse = RegisterUserResponse;
