import { Request } from "express";
import {
  requireAdminUser,
  requireUser,
} from "../../common/middleware/authenticate.middleware.js";
import {
  ConflictError,
  NotFoundError,
  UserForbiddenError,
} from "../../common/errors/errors.js";
import { subjectsRepository } from "../subjects/subjects.repository.js";
import { usersRepository } from "../users/users.repository.js";
import {
  toStudentResponse,
  toStudentSubjectLinkResponse,
  toStudentSubjectResponse,
  toEmergencyContactResponse,
} from "./students.mapper.js";
import { studentSubjectsRepository } from "./student-subjects.repository.js";
import { studentsRepository } from "./students.repository.js";
import { emergencyContactsRepository } from "./emergency-contacts.repository.js";
import {
  CreateStudentRequest,
  CreateStudentResponse,
  LinkStudentSubjectRequest,
  StudentResponse,
  StudentSubjectLinkResponse,
  StudentSubjectResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
  CreateEmergencyContactRequest,
  UpdateEmergencyContactRequest,
  EmergencyContactResponse,
} from "./students.types.js";

function normalizeOptionalGrade(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const MAX_EMERGENCY_CONTACTS = 2;

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
    if (actor.role === "tutor") {
      const rows = await studentsRepository.findStudentByTutorId(actor.id);
      return rows.map(toStudentResponse);
    }
    throw new UserForbiddenError("Only admins and parents can list students");
  },

  getStudent: async (req: Request, studentId: string): Promise<StudentResponse> => {
    const actor = requireUser(req);
    const student = await studentsRepository.findStudentById(studentId);

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (actor.role === "admin") {
      return toStudentResponse(student);
    }

    if (actor.role === "parent") {
      if (student.parentId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      return toStudentResponse(student);
    }

    if (actor.role === "tutor") {
      if (student.tutorId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      return toStudentResponse(student);
    }

    throw new UserForbiddenError("Access denied");
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

    if (body.tutorId !== undefined) {
      const tutor = await usersRepository.getUserById(body.tutorId);
      if (!tutor) {
        throw new NotFoundError("Tutor not found");
      }
      if (tutor.role !== "tutor") {
        throw new UserForbiddenError("Only tutors can be linked to students");
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

  linkStudentToSubject: async (
    req: Request,
    studentId: string,
    body: LinkStudentSubjectRequest,
  ): Promise<StudentSubjectLinkResponse> => {
    requireUser(req);

    const student = await studentsRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const subject = await subjectsRepository.findSubjectById(body.subjectId);
    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    const existing = await studentSubjectsRepository.findByStudentAndSubject(
      studentId,
      body.subjectId,
    );
    if (existing) {
      throw new ConflictError("Student is already linked to this subject");
    }

    const row = await studentSubjectsRepository.insertStudentSubject({
      studentId,
      subjectId: body.subjectId,
      currentGrade: normalizeOptionalGrade(body.currentGrade),
      predictedGrade: normalizeOptionalGrade(body.predictedGrade),
    });

    return toStudentSubjectLinkResponse(row);
  },

  getStudentSubjects: async (
    req: Request,
    studentId: string,
  ): Promise<StudentSubjectResponse[]> => {
    const actor = requireUser(req);
    const student = await studentsRepository.findStudentById(studentId);

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (actor.role === "admin") {
      const subjects =
        await studentSubjectsRepository.findSubjectsByStudentId(studentId);
      return subjects.map(toStudentSubjectResponse);
    }

    if (actor.role === "parent") {
      if (student.parentId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      const subjects =
        await studentSubjectsRepository.findSubjectsByStudentId(studentId);
      return subjects.map(toStudentSubjectResponse);
    }

    if (actor.role === "tutor") {
      if (student.tutorId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      const subjects =
        await studentSubjectsRepository.findSubjectsByStudentId(studentId);
      return subjects.map(toStudentSubjectResponse);
    }

    throw new UserForbiddenError("Access denied");
  },

  listEmergencyContacts: async (
    req: Request,
    studentId: string,
  ): Promise<EmergencyContactResponse[]> => {
    const actor = requireUser(req);
    const student = await studentsRepository.findStudentById(studentId);

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (actor.role === "admin") {
      const contacts = await emergencyContactsRepository.findByStudentId(studentId);
      return contacts.map(toEmergencyContactResponse);
    }

    if (actor.role === "parent") {
      if (student.parentId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      const contacts = await emergencyContactsRepository.findByStudentId(studentId);
      return contacts.map(toEmergencyContactResponse);
    }

    if (actor.role === "tutor") {
      if (student.tutorId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      const contacts = await emergencyContactsRepository.findByStudentId(studentId);
      return contacts.map(toEmergencyContactResponse);
    }

    throw new UserForbiddenError("Access denied");
  },

  createEmergencyContact: async (
    req: Request,
    studentId: string,
    body: CreateEmergencyContactRequest,
  ): Promise<EmergencyContactResponse> => {
    requireAdminUser(req);

    const student = await studentsRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const count = await emergencyContactsRepository.countByStudentId(studentId);
    if (count >= MAX_EMERGENCY_CONTACTS) {
      throw new ConflictError(
        `Maximum of ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed per student`,
      );
    }

    const contact = await emergencyContactsRepository.create({
      studentId,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship,
    });

    return toEmergencyContactResponse(contact);
  },

  updateEmergencyContact: async (
    req: Request,
    studentId: string,
    contactId: string,
    body: UpdateEmergencyContactRequest,
  ): Promise<EmergencyContactResponse> => {
    requireAdminUser(req);

    const student = await studentsRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const contact = await emergencyContactsRepository.findById(contactId);
    if (!contact || contact.studentId !== studentId) {
      throw new NotFoundError("Emergency contact not found");
    }

    const updated = await emergencyContactsRepository.update(contact.id, body);
    if (!updated) {
      throw new NotFoundError("Emergency contact not found");
    }

    return toEmergencyContactResponse(updated);
  },

  deleteEmergencyContact: async (
    req: Request,
    studentId: string,
    contactId: string,
  ): Promise<void> => {
    requireAdminUser(req);

    const student = await studentsRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const contact = await emergencyContactsRepository.findById(contactId);
    if (!contact || contact.studentId !== studentId) {
      throw new NotFoundError("Emergency contact not found");
    }

    await emergencyContactsRepository.deleteById(contact.id);
  },
};
