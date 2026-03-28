import type { Lesson } from "../../db/schema.js";
import { LessonResponse } from "./lessons.types.js";

export function toLessonResponse(lesson: Lesson): LessonResponse {
  return {
    id: lesson.id,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
    studentId: lesson.studentId,
    tutorId: lesson.tutorId,
    subjectId: lesson.subjectId,
    startsAt: lesson.startsAt,
    endsAt: lesson.endsAt,
    status: lesson.status,
    notes: lesson.notes ?? null,
  };
}
