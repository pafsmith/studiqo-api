import { NewUser } from "../../db/schema.js";
import { LoginUserResponse, RegisterUserResponse } from "./auth.types.js";

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
): LoginUserResponse {
  return {
    id: user.id as string,
    email: user.email,
    createdAt: user.createdAt as Date,
    token: token,
  };
}
