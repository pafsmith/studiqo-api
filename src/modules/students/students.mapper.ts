import { Student, StudentSubject } from "../../db/schema.js";
import { StudentResponse, StudentSubjectLinkResponse } from "./students.types.js";

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
