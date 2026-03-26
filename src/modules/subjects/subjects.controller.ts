import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { subjectsService } from "./subjects.service.js";

export const subjectsController = {
  createSubject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subject = await subjectsService.createSubject(req, req.body);
      respondWithJSON(res, 201, subject);
    } catch (error) {
      next(error);
    }
  },
};
