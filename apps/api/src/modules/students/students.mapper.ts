import { Student, StudentSubject, EmergencyContact } from "../../db/schema.js";
import {
  StudentResponse,
  StudentSubjectLinkResponse,
  StudentSubjectResponse,
  EmergencyContactResponse,
} from "./students.types.js";
import type { StudentSubjectWithDetails } from "./student-subjects.repository.js";

export function toStudentResponse(student: Student): StudentResponse {
  return {
    id: student.id,
    ...(student.organizationId ? { organizationId: student.organizationId } : {}),
    parentId: student.parentId,
    tutorId: student.tutorId,
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth,
  };
}

export function toStudentSubjectLinkResponse(
  row: StudentSubject,
): StudentSubjectLinkResponse {
  return {
    studentId: row.studentId,
    subjectId: row.subjectId,
    currentGrade: row.currentGrade ?? null,
    predictedGrade: row.predictedGrade ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toStudentSubjectResponse(
  row: StudentSubjectWithDetails,
): StudentSubjectResponse {
  return {
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    currentGrade: row.currentGrade ?? null,
    predictedGrade: row.predictedGrade ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toEmergencyContactResponse(
  contact: EmergencyContact,
): EmergencyContactResponse {
  return {
    id: contact.id,
    studentId: contact.studentId,
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}
