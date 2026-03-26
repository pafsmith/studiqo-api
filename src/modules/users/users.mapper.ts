import type { User } from "../../db/schema.js";
import type { RegisterUserResponse } from "../auth/auth.types.js";

export function toRegisterUserResponse(user: User): RegisterUserResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
