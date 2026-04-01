import { NextFunction, Request, Response } from "express";
import { requireUser } from "../../common/middleware/authenticate.middleware.js";
import { UserNotAuthenticatedError } from "../../common/errors/errors.js";
import { authService } from "./auth.service.js";
import { respondWithJSON } from "../../common/utils/json.js";

const refreshCookieName = authService.getRefreshTokenCookieName();
const refreshCookieOptions = authService.getRefreshTokenCookieOptions();

export const authController = {
  async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.registerUser(req.body);
      respondWithJSON(res, 201, user);
    } catch (error) {
      next(error);
    }
  },
  async loginUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.loginUser(req.body);
      res.cookie(refreshCookieName, user.refreshToken, refreshCookieOptions);
      respondWithJSON(res, 200, user);
    } catch (error) {
      next(error);
    }
  },
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      respondWithJSON(res, 200, await authService.getMe(user, req.organizationId));
    } catch (error) {
      next(error);
    }
  },
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const usesHeaderFallback =
        !req.cookies?.[refreshCookieName] && req.headers.authorization !== undefined;
      const token = await authService.refreshToken(req);
      if (!token.refreshToken) {
        throw new UserNotAuthenticatedError("Refresh token not found");
      }
      res.cookie(refreshCookieName, token.refreshToken, refreshCookieOptions);
      if (!usesHeaderFallback) {
        delete token.refreshToken;
      }
      respondWithJSON(res, 200, token);
    } catch (error) {
      next(error);
    }
  },
  async logoutUser(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logoutUser(req);
      res.clearCookie(refreshCookieName, refreshCookieOptions);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async setActiveOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const token = await authService.switchActiveOrganization(
        req,
        req.body.organizationId,
      );
      respondWithJSON(res, 200, token);
    } catch (error) {
      next(error);
    }
  },
};
