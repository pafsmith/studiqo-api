import { NewUser } from "../../db/schema.js";
import { RegisterUserResponse } from "./auth.types.js";

export function toRegisterUserResponse(user: NewUser): RegisterUserResponse {
  return {
    id: user.id as string,
    email: user.email,
    createdAt: user.createdAt as Date,
  };
}