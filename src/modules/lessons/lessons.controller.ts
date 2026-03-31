import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { lessonsService } from "./lessons.service.js";
import type { ListLessonsQuery } from "./lessons.types.js";

export const lessonsController = {
  listLessons: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query as unknown as ListLessonsQuery;
      const lessons = await lessonsService.listLessons(req, q);
      respondWithJSON(res, 200, lessons);
    } catch (error) {
      next(error);
    }
  },

  getLesson: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = req.params.lessonId;
      if (typeof lessonId !== "string") {
        throw new TypeError("lessonId must be a string");
      }
      const lesson = await lessonsService.getLesson(req, lessonId);
      respondWithJSON(res, 200, lesson);
    } catch (error) {
      next(error);
    }
  },

  createLesson: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lesson = await lessonsService.createLesson(req, req.body);
      respondWithJSON(res, 201, lesson);
    } catch (error) {
      next(error);
    }
  },

  updateLesson: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = req.params.lessonId;
      if (typeof lessonId !== "string") {
        throw new TypeError("lessonId must be a string");
      }
      const lesson = await lessonsService.updateLesson(req, lessonId, req.body);
      respondWithJSON(res, 200, lesson);
    } catch (error) {
      next(error);
    }
  },

  completeLesson: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = req.params.lessonId;
      if (typeof lessonId !== "string") {
        throw new TypeError("lessonId must be a string");
      }
      const lesson = await lessonsService.completeLesson(req, lessonId);
      respondWithJSON(res, 200, lesson);
    } catch (error) {
      next(error);
    }
  },

  cancelLesson: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = req.params.lessonId;
      if (typeof lessonId !== "string") {
        throw new TypeError("lessonId must be a string");
      }
      const lesson = await lessonsService.cancelLesson(req, lessonId);
      respondWithJSON(res, 200, lesson);
    } catch (error) {
      next(error);
    }
  },
};
