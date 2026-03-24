import { Request } from "express";
import {
  NotFoundError,
  UserForbiddenError,
} from "../../common/errors/errors.js";
import { config } from "../../config/config.js";
import { authRepository } from "../auth/auth.repository.js";
import { authService } from "../auth/auth.service.js";
import { toStudentResponse } from "./students.mapper.js";
import { studentsRepository } from "./students.repository.js";
import {
  CreateStudentRequest,
  CreateStudentResponse,
  StudentResponse,
} from "./students.types.js";

export const studentsService = {
  listStudents: async (req: Request): Promise<StudentResponse[]> => {
    const token = authService.getBearerToken(req);
    const userId = authService.validateJWT(token, config.jwt.secret);
    const actor = await authRepository.getUserById(userId);
    if (!actor) {
      throw new NotFoundError("User not found");
    }
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
    const token = authService.getBearerToken(req);
    const userId = authService.validateJWT(token, config.jwt.secret);
    const actor = await authRepository.getUserById(userId);
    if (!actor) {
      throw new NotFoundError("User not found");
    }
    if (actor.role !== "admin") {
      throw new UserForbiddenError("Only admins can create students");
    }
    const parent = await authRepository.getUserById(student.parentId);
    if (!parent) {
      throw new NotFoundError("Parent not found");
    }
    if (parent.role !== "parent") {
      throw new UserForbiddenError("Only parents can be linked to students");
    }
    const newStudent = await studentsRepository.createStudent(student);
    return toStudentResponse(newStudent);
  },
};
