import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { subjectsService } from "./subjects.service.js";

export const subjectsController = {
  listSubjects: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subjects = await subjectsService.listSubjects(req);
      respondWithJSON(res, 200, subjects);
    } catch (error) {
      next(error);
    }
  },

  createSubject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subject = await subjectsService.createSubject(req, req.body);
      respondWithJSON(res, 201, subject);
    } catch (error) {
      next(error);
    }
  },
};
