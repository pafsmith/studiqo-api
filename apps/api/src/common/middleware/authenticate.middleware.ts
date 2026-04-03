import { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  NotFoundError,
  UserForbiddenError,
  UserNotAuthenticatedError,
} from "../errors/errors.js";
import { config } from "../../config/config.js";
import { usersRepository } from "../../modules/users/users.repository.js";
import { authService } from "../../modules/auth/auth.service.js";
import { organizationsRepository } from "../../modules/organizations/organizations.repository.js";
import type { OrganizationMembershipRole, User } from "../../db/schema.js";

export type OrganizationContext = {
  organizationId: string;
  organizationRole?: OrganizationMembershipRole;
};

async function resolveOrganizationContext(
  req: Request,
  user: User,
  tokenOrganizationId: string | undefined,
): Promise<void> {
  const headerOrganizationId = req.header("x-organization-id");
  const requestedOrganizationId = headerOrganizationId ?? tokenOrganizationId;
  const memberships = await organizationsRepository.listMembershipsForUser(user.id);

  if (user.isSuperadmin) {
    if (requestedOrganizationId !== undefined) {
      req.organizationId = requestedOrganizationId;
      const membership = memberships.find(
        (row) => row.organizationId === requestedOrganizationId,
      );
      req.organizationRole = membership?.role;
      return;
    }
    if (memberships.length > 0) {
      req.organizationId = memberships[0].organizationId;
      req.organizationRole = memberships[0].role;
    }
    return;
  }

  if (memberships.length === 0) {
    if (requestedOrganizationId !== undefined) {
      throw new UserForbiddenError("You do not belong to this organization");
    }
    return;
  }

  if (requestedOrganizationId !== undefined) {
    const membership = memberships.find(
      (row) => row.organizationId === requestedOrganizationId,
    );
    if (!membership) {
      throw new UserForbiddenError("You do not belong to this organization");
    }
    req.organizationId = membership.organizationId;
    req.organizationRole = membership.role;
    return;
  }

  req.organizationId = memberships[0].organizationId;
  req.organizationRole = memberships[0].role;
}

/**
 * Validates Bearer JWT, loads the user from the DB, and sets `req.user`.
 * Must be registered before handlers that call `requireUser(req)`.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = authService.getBearerToken(req);
    const payload = authService.validateJWT(token, config.jwt.secret);
    const userId = payload.userId;
    const user = await usersRepository.getUserById(userId);
    if (!user) {
      return next(new NotFoundError("User not found"));
    }
    req.user = user;
    await resolveOrganizationContext(req, user, payload.organizationId);
    next();
  } catch (err) {
    next(err);
  }
}

/** Narrows `req.user` after `authenticate`; throws if the route was misconfigured. */
export function requireUser(req: Request): User {
  if (req.user === undefined) {
    throw new UserNotAuthenticatedError("Not authenticated");
  }
  return req.user;
}

/**
 * Narrows `req.user` to an admin. Use on handlers reached only after `requireAdmin` middleware,
 * or call directly when enforcing admin in code that is not behind that middleware.
 */
export function requireAdminUser(req: Request): User {
  const user = requireUser(req);
  if (user.isSuperadmin) {
    return user;
  }
  if (req.organizationRole !== "org_admin") {
    throw new UserForbiddenError("Organization admin access required");
  }
  return user;
}

export function requireOrganizationContext(req: Request): OrganizationContext {
  if (!req.organizationId) {
    throw new BadRequestError("Active organization context is required");
  }
  return {
    organizationId: req.organizationId,
    organizationRole: req.organizationRole,
  };
}
/**
 * After `authenticate`, ensures the caller is an admin. Register on admin-only routes
 * (e.g. before `validate` and the controller).
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    requireAdminUser(req);
    next();
  } catch (err) {
    next(err);
  }
}
