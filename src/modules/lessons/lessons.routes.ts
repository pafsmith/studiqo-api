import { Router } from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import {
  cancelLessonSchema,
  createLessonSchema,
  getLessonSchema,
  listLessonsQuerySchema,
} from "./lessons.schema.js";
import { lessonsController } from "./lessons.controller.js";

export const lessonsRoutes = Router();

lessonsRoutes.use(authenticate);

lessonsRoutes.get("/", validate(listLessonsQuerySchema), lessonsController.listLessons);
lessonsRoutes.post(
  "/",
  requireAdmin,
  validate(createLessonSchema),
  lessonsController.createLesson,
);
lessonsRoutes.post(
  "/:lessonId/cancel",
  validate(cancelLessonSchema),
  lessonsController.cancelLesson,
);
lessonsRoutes.get("/:lessonId", validate(getLessonSchema), lessonsController.getLesson);
