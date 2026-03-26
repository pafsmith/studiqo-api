import { Request } from "express";
import { requireUser } from "../../common/middleware/authenticate.middleware.js";
import { NotFoundError, UserForbiddenError } from "../../common/errors/errors.js";
import { usersRepository } from "../users/users.repository.js";
import { toStudentResponse } from "./students.mapper.js";
import { studentsRepository } from "./students.repository.js";
import {
  CreateStudentRequest,
  CreateStudentResponse,
  StudentResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from "./students.types.js";

export const studentsService = {
  listStudents: async (req: Request): Promise<StudentResponse[]> => {
    const actor = requireUser(req);
    if (actor.role === "admin") {
      const rows = await studentsRepository.findAllStudents();
      return rows.map(toStudentResponse);
    }
    if (actor.role === "parent") {
      const rows = await studentsRepository.findStudentsByParentId(actor.id);
      return rows.map(toStudentResponse);
    }
    throw new UserForbiddenError("Only admins and parents can list students");
  },

  createStudent: async (
    req: Request,
    student: CreateStudentRequest,
  ): Promise<CreateStudentResponse> => {
    requireUser(req);
    const parent = await usersRepository.getUserById(student.parentId);
    if (!parent) {
      throw new NotFoundError("Parent not found");
    }
    if (parent.role !== "parent") {
      throw new UserForbiddenError("Only parents can be linked to students");
    }
    const newStudent = await studentsRepository.createStudent(student);
    return toStudentResponse(newStudent);
  },

  updateStudent: async (
    req: Request,
    studentId: string,
    body: UpdateStudentRequest,
  ): Promise<UpdateStudentResponse> => {
    requireUser(req);

    const existing = await studentsRepository.findStudentById(studentId);
    if (!existing) {
      throw new NotFoundError("Student not found");
    }

    if (body.parentId !== undefined) {
      const parent = await usersRepository.getUserById(body.parentId);
      if (!parent) {
        throw new NotFoundError("Parent not found");
      }
      if (parent.role !== "parent") {
        throw new UserForbiddenError("Only parents can be linked to students");
      }
    }

    const updated = await studentsRepository.updateStudent(studentId, body);
    if (!updated) {
      throw new NotFoundError("Student not found");
    }
    return toStudentResponse(updated);
  },

  deleteStudent: async (req: Request, studentId: string): Promise<void> => {
    requireUser(req);

    const deleted = await studentsRepository.deleteStudentById(studentId);
    if (!deleted) {
      throw new NotFoundError("Student not found");
    }
  },
};
