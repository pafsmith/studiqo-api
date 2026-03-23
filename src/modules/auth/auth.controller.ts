import { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service.js";
import { respondWithJSON } from "../../common/utils/json.js";
import { RegisterUserResponse } from "./auth.types.js";

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
      respondWithJSON(res, 200, user);
    } catch (error) {
      next(error);
    }
  },
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req);
      respondWithJSON(res, 200, user);
    } catch (error) {
      next(error);
    }
  },
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = await authService.refreshToken(req);
      respondWithJSON(res, 200, token);
    } catch (error) {
      next(error);
    }
  },
};
