import { Router } from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import {
  cancelLessonSchema,
  completeLessonSchema,
  createLessonSchema,
  getLessonSchema,
  listLessonsQuerySchema,
  updateLessonSchema,
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
  "/:lessonId/complete",
  validate(completeLessonSchema),
  lessonsController.completeLesson,
);
lessonsRoutes.post(
  "/:lessonId/cancel",
  validate(cancelLessonSchema),
  lessonsController.cancelLesson,
);
lessonsRoutes.put(
  "/:lessonId",
  requireAdmin,
  validate(updateLessonSchema),
  lessonsController.updateLesson,
);
lessonsRoutes.get("/:lessonId", validate(getLessonSchema), lessonsController.getLesson);
