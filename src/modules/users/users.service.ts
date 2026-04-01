import { Request } from "express";
import {
  requireAdminUser,
  requireOrganizationContext,
  requireUser,
} from "../../common/middleware/authenticate.middleware.js";
import {
  BadRequestError,
  NotFoundError,
  UserForbiddenError,
} from "../../common/errors/errors.js";
import { organizationsRepository } from "../organizations/organizations.repository.js";
import { toRegisterUserResponse } from "./users.mapper.js";
import { usersRepository } from "./users.repository.js";
import { UpdateUserRequest, UpdateUserResponse } from "./users.types.js";

export const usersService = {
  updateUser: async (
    req: Request,
    userId: string,
    body: UpdateUserRequest,
  ): Promise<UpdateUserResponse> => {
    const actor = requireUser(req);
    requireAdminUser(req);
    const { organizationId } = requireOrganizationContext(req);

    const existing = actor.isSuperadmin
      ? await usersRepository.getUserById(userId)
      : await usersRepository.getUserByIdInOrganization(userId, organizationId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const patch: Partial<{ email: string }> = {};

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const other = await usersRepository.getUserByEmail(email);
      if (other && other.id !== userId) {
        throw new BadRequestError("User with this email already exists");
      }
      patch.email = email;
    }

    if (body.role !== undefined) {
      const membership = await organizationsRepository.findMembership(organizationId, userId);
      if (!membership) {
        throw new NotFoundError("Organization membership not found");
      }
      await organizationsRepository.createMembership({
        organizationId,
        userId,
        role: body.role,
      });
    }

    const updated = await usersRepository.updateUser(userId, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    const visibleToActor = actor.isSuperadmin
      ? updated
      : await usersRepository.getUserByIdInOrganization(userId, organizationId);
    if (!visibleToActor) {
      throw new UserForbiddenError("Access denied");
    }
    const membership = await organizationsRepository.findMembership(
      organizationId,
      visibleToActor.id,
    );
    return toRegisterUserResponse(visibleToActor, organizationId, membership?.role);
  },

  deleteUser: async (req: Request, userId: string): Promise<void> => {
    const actor = requireUser(req);
    requireAdminUser(req);
    const { organizationId } = requireOrganizationContext(req);

    if (!actor.isSuperadmin) {
      const existing = await usersRepository.getUserByIdInOrganization(userId, organizationId);
      if (!existing) {
        throw new NotFoundError("User not found");
      }
    }

    const deleted = await usersRepository.deleteUserById(userId);
    if (!deleted) {
      throw new NotFoundError("User not found");
    }
  },
};
