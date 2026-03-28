import { Router } from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { createLessonSchema } from "./lessons.schema.js";
import { lessonsController } from "./lessons.controller.js";

export const lessonsRoutes = Router();

lessonsRoutes.use(authenticate);

lessonsRoutes.post(
  "/",
  requireAdmin,
  validate(createLessonSchema),
  lessonsController.createLesson,
);
