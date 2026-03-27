import { Student, StudentSubject } from "../../db/schema.js";
import {
  StudentResponse,
  StudentSubjectLinkResponse,
  StudentSubjectResponse,
} from "./students.types.js";
import type { StudentSubjectWithDetails } from "./student-subjects.repository.js";

export function toStudentResponse(student: Student): StudentResponse {
  return {
    id: student.id,
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
