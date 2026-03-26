import { NextFunction, Request, Response } from "express";
import {
  NotFoundError,
  UserForbiddenError,
  UserNotAuthenticatedError,
} from "../errors/errors.js";
import { config } from "../../config/config.js";
import { usersRepository } from "../../modules/users/users.repository.js";
import { authService } from "../../modules/auth/auth.service.js";
import type { User } from "../../db/schema.js";

/**
 * Validates Bearer JWT, loads the user from the DB, and sets `req.user`.
 * Must be registered before handlers that call `requireUser(req)`.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = authService.getBearerToken(req);
    const userId = authService.validateJWT(token, config.jwt.secret);
    const user = await usersRepository.getUserById(userId);
    if (!user) {
      return next(new NotFoundError("User not found"));
    }
    req.user = user;
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
  if (user.role !== "admin") {
    throw new UserForbiddenError("Admin access required");
  }
  return user;
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
