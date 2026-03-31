import { Request } from "express";
import {
  requireAdminUser,
  requireUser,
} from "../../common/middleware/authenticate.middleware.js";
import {
  BadRequestError,
  NotFoundError,
  UserForbiddenError,
} from "../../common/errors/errors.js";
import { subjectsRepository } from "../subjects/subjects.repository.js";
import { usersRepository } from "../users/users.repository.js";
import { studentSubjectsRepository } from "../students/student-subjects.repository.js";
import { studentsRepository } from "../students/students.repository.js";
import { lessonsRepository } from "./lessons.repository.js";
import { toLessonResponse } from "./lessons.mapper.js";
import type {
  CancelLessonResponse,
  CompleteLessonResponse,
  CreateLessonRequest,
  CreateLessonResponse,
  LessonResponse,
  ListLessonsQuery,
  UpdateLessonRequest,
  UpdateLessonResponse,
} from "./lessons.types.js";

function asBoundaryDate(value: unknown, label: string): Date {
  const d =
    value instanceof Date
      ? value
      : new Date(typeof value === "string" ? value : String(value));
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError(`Invalid ${label}`);
  }
  return d;
}

export const lessonsService = {
  listLessons: async (
    req: Request,
    query: ListLessonsQuery,
  ): Promise<LessonResponse[]> => {
    const actor = requireUser(req);
    const from = asBoundaryDate(query.from, "from");
    const to = asBoundaryDate(query.to, "to");
    const { studentId, tutorId } = query;

    if (actor.role === "admin") {
      const rows = await lessonsRepository.findInRangeOverlapping({
        from,
        to,
        studentId,
        tutorId,
      });
      return rows.map(toLessonResponse);
    }

    if (actor.role === "parent") {
      if (studentId !== undefined) {
        const student = await studentsRepository.findStudentById(studentId);
        if (!student || student.parentId !== actor.id) {
          throw new UserForbiddenError("Access denied");
        }
        const rows = await lessonsRepository.findInRangeOverlapping({
          from,
          to,
          studentId,
        });
        return rows.map(toLessonResponse);
      }
      const kids = await studentsRepository.findStudentsByParentId(actor.id);
      const ids = kids.map((s) => s.id);
      const rows = await lessonsRepository.findInRangeForParentStudents({
        from,
        to,
        studentIds: ids,
      });
      return rows.map(toLessonResponse);
    }

    if (actor.role === "tutor") {
      if (studentId !== undefined) {
        const student = await studentsRepository.findStudentById(studentId);
        if (!student || student.tutorId !== actor.id) {
          throw new UserForbiddenError("Access denied");
        }
        const rows = await lessonsRepository.findInRangeOverlapping({
          from,
          to,
          studentId,
        });
        return rows.map(toLessonResponse);
      }
      const assigned = await studentsRepository.findStudentByTutorId(actor.id);
      const assignedIds = assigned.map((s) => s.id);
      const rows = await lessonsRepository.findInRangeForTutorAccess({
        from,
        to,
        tutorUserId: actor.id,
        assignedStudentIds: assignedIds,
      });
      return rows.map(toLessonResponse);
    }

    throw new UserForbiddenError("Access denied");
  },

  getLesson: async (req: Request, lessonId: string): Promise<LessonResponse> => {
    const actor = requireUser(req);
    const lesson = await lessonsRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    const student = await studentsRepository.findStudentById(lesson.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (actor.role === "admin") {
      return toLessonResponse(lesson);
    }

    if (actor.role === "parent") {
      if (student.parentId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
      return toLessonResponse(lesson);
    }

    if (actor.role === "tutor") {
      if (lesson.tutorId === actor.id || student.tutorId === actor.id) {
        return toLessonResponse(lesson);
      }
      throw new UserForbiddenError("Access denied");
    }

    throw new UserForbiddenError("Access denied");
  },

  createLesson: async (
    req: Request,
    body: CreateLessonRequest,
  ): Promise<CreateLessonResponse> => {
    requireAdminUser(req);

    const student = await studentsRepository.findStudentById(body.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (!student.tutorId) {
      throw new BadRequestError("Student must have an assigned tutor");
    }

    if (student.tutorId !== body.tutorId) {
      throw new BadRequestError("Lesson tutor must match the student's assigned tutor");
    }

    const tutor = await usersRepository.getUserById(body.tutorId);
    if (!tutor) {
      throw new NotFoundError("Tutor not found");
    }
    if (tutor.role !== "tutor") {
      throw new BadRequestError("Only tutors can be assigned to lessons");
    }

    const subject = await subjectsRepository.findSubjectById(body.subjectId);
    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    const enrollment = await studentSubjectsRepository.findByStudentAndSubject(
      body.studentId,
      body.subjectId,
    );
    if (!enrollment) {
      throw new BadRequestError("Student is not enrolled in this subject");
    }

    const lesson = await lessonsRepository.create({
      studentId: body.studentId,
      tutorId: body.tutorId,
      subjectId: body.subjectId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });

    return toLessonResponse(lesson);
  },

  updateLesson: async (
    req: Request,
    lessonId: string,
    body: UpdateLessonRequest,
  ): Promise<UpdateLessonResponse> => {
    requireAdminUser(req);

    const lesson = await lessonsRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    if (lesson.status !== "scheduled") {
      throw new BadRequestError("Only scheduled lessons can be updated");
    }

    const patch: Partial<UpdateLessonRequest> = {};

    const resolvedTutorId = body.tutorId ?? lesson.tutorId;
    const resolvedSubjectId = body.subjectId ?? lesson.subjectId;

    if (body.tutorId !== undefined || body.subjectId !== undefined) {
      const student = await studentsRepository.findStudentById(lesson.studentId);
      if (!student) {
        throw new NotFoundError("Student not found");
      }

      if (body.tutorId !== undefined) {
        if (student.tutorId !== resolvedTutorId) {
          throw new BadRequestError("Lesson tutor must match the student's assigned tutor");
        }
        const tutor = await usersRepository.getUserById(resolvedTutorId);
        if (!tutor) {
          throw new NotFoundError("Tutor not found");
        }
        if (tutor.role !== "tutor") {
          throw new BadRequestError("Only tutors can be assigned to lessons");
        }
        patch.tutorId = body.tutorId;
      }

      if (body.subjectId !== undefined) {
        const subject = await subjectsRepository.findSubjectById(resolvedSubjectId);
        if (!subject) {
          throw new NotFoundError("Subject not found");
        }
        const enrollment = await studentSubjectsRepository.findByStudentAndSubject(
          lesson.studentId,
          resolvedSubjectId,
        );
        if (!enrollment) {
          throw new BadRequestError("Student is not enrolled in this subject");
        }
        patch.subjectId = body.subjectId;
      }
    }

    if (body.startsAt !== undefined) patch.startsAt = body.startsAt;
    if (body.endsAt !== undefined) patch.endsAt = body.endsAt;
    if (body.notes !== undefined) patch.notes = body.notes;

    const updated = await lessonsRepository.updateLesson(lessonId, patch);
    if (!updated) {
      throw new NotFoundError("Lesson not found");
    }
    return toLessonResponse(updated);
  },

  completeLesson: async (
    req: Request,
    lessonId: string,
  ): Promise<CompleteLessonResponse> => {
    const actor = requireUser(req);

    if (actor.role === "parent") {
      throw new UserForbiddenError("Access denied");
    }

    const lesson = await lessonsRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    const student = await studentsRepository.findStudentById(lesson.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (actor.role === "tutor") {
      if (lesson.tutorId !== actor.id && student.tutorId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
    } else if (actor.role !== "admin") {
      throw new UserForbiddenError("Access denied");
    }

    if (lesson.status === "completed") {
      return toLessonResponse(lesson);
    }
    if (lesson.status === "cancelled") {
      throw new BadRequestError("Cannot complete a cancelled lesson");
    }

    const updated = await lessonsRepository.updateStatusById(lessonId, "completed");
    if (!updated) {
      throw new NotFoundError("Lesson not found");
    }
    return toLessonResponse(updated);
  },

  cancelLesson: async (
    req: Request,
    lessonId: string,
  ): Promise<CancelLessonResponse> => {
    const actor = requireUser(req);

    if (actor.role === "parent") {
      throw new UserForbiddenError("Access denied");
    }

    const lesson = await lessonsRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    const student = await studentsRepository.findStudentById(lesson.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (actor.role === "tutor") {
      if (lesson.tutorId !== actor.id && student.tutorId !== actor.id) {
        throw new UserForbiddenError("Access denied");
      }
    } else if (actor.role !== "admin") {
      throw new UserForbiddenError("Access denied");
    }
    // TODO: Add notification for cancellation
    if (lesson.status === "cancelled") {
      return toLessonResponse(lesson);
    }
    if (lesson.status === "completed") {
      throw new BadRequestError("Cannot cancel a completed lesson");
    }

    const updated = await lessonsRepository.updateStatusById(lessonId, "cancelled");
    if (!updated) {
      throw new NotFoundError("Lesson not found");
    }
    return toLessonResponse(updated);
  },
};
