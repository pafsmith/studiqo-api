import { Request } from "express";
import { requireAdminUser } from "../../common/middleware/authenticate.middleware.js";
import { BadRequestError, NotFoundError } from "../../common/errors/errors.js";
import { subjectsRepository } from "../subjects/subjects.repository.js";
import { usersRepository } from "../users/users.repository.js";
import { studentSubjectsRepository } from "../students/student-subjects.repository.js";
import { studentsRepository } from "../students/students.repository.js";
import { lessonsRepository } from "./lessons.repository.js";
import { toLessonResponse } from "./lessons.mapper.js";
import type { CreateLessonRequest, CreateLessonResponse } from "./lessons.types.js";

export const lessonsService = {
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
};
