import { Student } from "../../db/schema.js";
import { StudentResponse } from "./students.types.js";

export function toStudentResponse(student: Student): StudentResponse {
    return {
        id: student.id,
        parentId: student.parentId,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
    };
};