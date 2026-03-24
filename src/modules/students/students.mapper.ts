import { Student } from "../../db/schema.js";
import { CreateStudentResponse } from "./students.types.js";

export function toStudentResponse(student: Student): CreateStudentResponse {
    return {
        id: student.id,
        parentId: student.parentId,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
    };
};