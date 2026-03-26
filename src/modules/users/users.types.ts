import type { RegisterUserResponse } from "../auth/auth.types.js";
import type { UserRole } from "../../db/schema.js";

export type UpdateUserRequest = {
  email?: string;
  role?: UserRole;
};

export type UpdateUserResponse = RegisterUserResponse;
