import { Request } from "express";
import { requireUser } from "../../common/middleware/authenticate.middleware.js";
import { BadRequestError, NotFoundError } from "../../common/errors/errors.js";
import type { UserRole } from "../../db/schema.js";
import { toRegisterUserResponse } from "./users.mapper.js";
import { usersRepository } from "./users.repository.js";
import { UpdateUserRequest, UpdateUserResponse } from "./users.types.js";

export const usersService = {
  updateUser: async (
    req: Request,
    userId: string,
    body: UpdateUserRequest,
  ): Promise<UpdateUserResponse> => {
    requireUser(req);

    const existing = await usersRepository.getUserById(userId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const patch: Partial<{ email: string; role: UserRole }> = {};

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const other = await usersRepository.getUserByEmail(email);
      if (other && other.id !== userId) {
        throw new BadRequestError("User with this email already exists");
      }
      patch.email = email;
    }

    if (body.role !== undefined) {
      patch.role = body.role;
    }

    const updated = await usersRepository.updateUser(userId, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    return toRegisterUserResponse(updated);
  },

  deleteUser: async (req: Request, userId: string): Promise<void> => {
    requireUser(req);

    const deleted = await usersRepository.deleteUserById(userId);
    if (!deleted) {
      throw new NotFoundError("User not found");
    }
  },
};
