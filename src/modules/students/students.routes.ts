import { Router } from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { studentsController } from "./students.controller.js";
import {
  createStudentSchema,
  deleteStudentSchema,
  getStudentSchema,
  linkStudentSubjectSchema,
  updateStudentSchema,
} from "./students.schema.js";

export const studentsRoutes = Router();

studentsRoutes.use(authenticate);

studentsRoutes.get("/", studentsController.listStudents);
studentsRoutes.get(
  "/:studentId",
  validate(getStudentSchema),
  studentsController.getStudent,
);
studentsRoutes.post(
  "/",
  requireAdmin,
  validate(createStudentSchema),
  studentsController.createStudent,
);
studentsRoutes.get(
  "/:studentId/subjects",
  validate(getStudentSchema),
  studentsController.getStudentSubjects,
);
studentsRoutes.post(
  "/:studentId/subjects",
  requireAdmin,
  validate(linkStudentSubjectSchema),
  studentsController.linkStudentSubject,
);
studentsRoutes.put(
  "/:studentId",
  requireAdmin,
  validate(updateStudentSchema),
  studentsController.updateStudent,
);
studentsRoutes.delete(
  "/:studentId",
  requireAdmin,
  validate(deleteStudentSchema),
  studentsController.deleteStudent,
);
