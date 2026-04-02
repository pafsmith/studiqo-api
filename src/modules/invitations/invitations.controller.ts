import type { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { invitationsService } from "./invitations.service.js";
import { authService } from "../auth/auth.service.js";

const refreshCookieName = authService.getRefreshTokenCookieName();
const refreshCookieOptions = authService.getRefreshTokenCookieOptions();

export const invitationsController = {
  getInvitationDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.params.token);
      const invitation = await invitationsService.getInvitationDetails(token);
      respondWithJSON(res, 200, invitation);
    } catch (error) {
      next(error);
    }
  },

  acceptInvitation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.params.token);
      const session = await invitationsService.acceptInvitation(token, req.body);
      res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions);
      respondWithJSON(res, 200, session);
    } catch (error) {
      next(error);
    }
  },
};
