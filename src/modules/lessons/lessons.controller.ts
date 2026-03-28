import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { lessonsService } from "./lessons.service.js";

export const lessonsController = {
  createLesson: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lesson = await lessonsService.createLesson(req, req.body);
      respondWithJSON(res, 201, lesson);
    } catch (error) {
      next(error);
    }
  },
};
