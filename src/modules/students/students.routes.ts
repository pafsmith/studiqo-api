import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { studentsController } from "./students.controller.js";
import {
  createStudentSchema,
  deleteStudentSchema,
  updateStudentSchema,
} from "./students.schema.js";

export const studentsRoutes = Router();

studentsRoutes.use(authenticate);

studentsRoutes.get("/", studentsController.listStudents);
studentsRoutes.post(
  "/",
  validate(createStudentSchema),
  studentsController.createStudent,
);
studentsRoutes.put(
  "/:studentId",
  validate(updateStudentSchema),
  studentsController.updateStudent,
);
studentsRoutes.delete(
  "/:studentId",
  validate(deleteStudentSchema),
  studentsController.deleteStudent,
);
