import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { usersService } from "./users.service.js";

export const usersController = {
  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      if (typeof userId !== "string") {
        throw new TypeError("userId must be a string");
      }
      const user = await usersService.updateUser(req, userId, req.body);
      respondWithJSON(res, 200, user);
    } catch (error) {
      next(error);
    }
  },
};
