import type { LessonStatus } from "../../db/schema.js";

export type ListLessonsQuery = {
  from: Date;
  to: Date;
  studentId?: string;
  tutorId?: string;
};

export type CreateLessonRequest = {
  studentId: string;
  tutorId: string;
  subjectId: string;
  startsAt: Date;
  endsAt: Date;
};

export type LessonResponse = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  studentId: string;
  tutorId: string;
  subjectId: string;
  startsAt: Date;
  endsAt: Date;
  status: LessonStatus;
  notes: string | null;
};

export type CreateLessonResponse = LessonResponse;
