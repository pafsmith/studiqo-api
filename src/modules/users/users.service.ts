import { Request } from "express";
import { requireUser } from "../../common/middleware/authenticate.middleware.js";
import {
  BadRequestError,
  NotFoundError,
  UserForbiddenError,
} from "../../common/errors/errors.js";
import type { UserRole } from "../../db/schema.js";
import { authRepository } from "../auth/auth.repository.js";
import { toRegisterUserResponse } from "../auth/auth.mapper.js";
import { UpdateUserRequest, UpdateUserResponse } from "./users.types.js";

export const usersService = {
  updateUser: async (
    req: Request,
    userId: string,
    body: UpdateUserRequest,
  ): Promise<UpdateUserResponse> => {
    const actor = requireUser(req);
    if (actor.role !== "admin") {
      throw new UserForbiddenError("Only admins can update users");
    }

    const existing = await authRepository.getUserById(userId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const patch: Partial<{ email: string; role: UserRole }> = {};

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const other = await authRepository.getUserByEmail(email);
      if (other && other.id !== userId) {
        throw new BadRequestError("User with this email already exists");
      }
      patch.email = email;
    }

    if (body.role !== undefined) {
      patch.role = body.role;
    }

    const updated = await authRepository.updateUser(userId, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    return toRegisterUserResponse(updated);
  },
};
