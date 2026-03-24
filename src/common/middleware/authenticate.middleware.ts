import { NextFunction, Request, Response } from "express";
import { NotFoundError, UserNotAuthenticatedError } from "../errors/errors.js";
import { config } from "../../config/config.js";
import { authRepository } from "../../modules/auth/auth.repository.js";
import { authService } from "../../modules/auth/auth.service.js";
import type { User } from "../../db/schema.js";

/**
 * Validates Bearer JWT, loads the user from the DB, and sets `req.user`.
 * Must be registered before handlers that call `requireUser(req)`.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = authService.getBearerToken(req);
    const userId = authService.validateJWT(token, config.jwt.secret);
    const user = await authRepository.getUserById(userId);
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
