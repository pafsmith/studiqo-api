import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { studentsService } from "./students.service.js";

export const studentsController = {
  createStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentsService.createStudent(req, req.body);
      respondWithJSON(res, 201, student);
    } catch (error) {
      next(error);
    }
  },
};