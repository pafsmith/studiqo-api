import { Router } from "express";
import { studentsController } from "./students.controller.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { createStudentSchema } from "./students.schema.js";

export const studentsRoutes = Router();

studentsRoutes.get("/", studentsController.listStudents);
studentsRoutes.post("/", validate(createStudentSchema), studentsController.createStudent);