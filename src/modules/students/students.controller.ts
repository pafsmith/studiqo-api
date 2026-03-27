import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { studentsService } from "./students.service.js";

export const studentsController = {
  listStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const students = await studentsService.listStudents(req);
      respondWithJSON(res, 200, students);
    } catch (error) {
      next(error);
    }
  },

  getStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId;
      if (typeof studentId !== "string") {
        throw new TypeError("studentId must be a string");
      }
      const student = await studentsService.getStudent(req, studentId);
      respondWithJSON(res, 200, student);
    } catch (error) {
      next(error);
    }
  },

  createStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentsService.createStudent(req, req.body);
      respondWithJSON(res, 201, student);
    } catch (error) {
      next(error);
    }
  },

  updateStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId;
      if (typeof studentId !== "string") {
        throw new TypeError("studentId must be a string");
      }
      const student = await studentsService.updateStudent(req, studentId, req.body);
      respondWithJSON(res, 200, student);
    } catch (error) {
      next(error);
    }
  },

  deleteStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId;
      if (typeof studentId !== "string") {
        throw new TypeError("studentId must be a string");
      }
      await studentsService.deleteStudent(req, studentId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  linkStudentSubject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId;
      if (typeof studentId !== "string") {
        throw new TypeError("studentId must be a string");
      }
      const link = await studentsService.linkStudentToSubject(req, studentId, req.body);
      respondWithJSON(res, 201, link);
    } catch (error) {
      next(error);
    }
  },

  getStudentSubjects: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId;
      if (typeof studentId !== "string") {
        throw new TypeError("studentId must be a string");
      }
      const subjects = await studentsService.getStudentSubjects(req, studentId);
      respondWithJSON(res, 200, subjects);
    } catch (error) {
      next(error);
    }
  },
};
