import { Router } from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { createSubjectSchema } from "./subjects.schema.js";
import { subjectsController } from "./subjects.controller.js";

export const subjectsRoutes = Router();

subjectsRoutes.use(authenticate);

subjectsRoutes.get("/", subjectsController.listSubjects);
subjectsRoutes.post(
  "/",
  requireAdmin,
  validate(createSubjectSchema),
  subjectsController.createSubject,
);
