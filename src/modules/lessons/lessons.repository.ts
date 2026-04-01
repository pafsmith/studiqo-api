import { and, asc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  lessons,
  type Lesson,
  type LessonStatus,
  type NewLesson,
} from "../../db/schema.js";

function overlapRange(from: Date, to: Date) {
  return and(lt(lessons.startsAt, to), gt(lessons.endsAt, from));
}

export type FindLessonsInRangeParams = {
  organizationId: string;
  from: Date;
  to: Date;
  studentId?: string;
  tutorId?: string;
};

export const lessonsRepository = {
  create: async (row: NewLesson): Promise<Lesson> => {
    const [result] = await db.insert(lessons).values(row).returning();
    return result;
  },

  findById: async (
    id: string,
    organizationId: string,
  ): Promise<Lesson | undefined> => {
    const [row] = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, id), eq(lessons.organizationId, organizationId)));
    return row;
  },

  updateStatusById: async (
    id: string,
    organizationId: string,
    status: LessonStatus,
  ): Promise<Lesson | undefined> => {
    const [row] = await db
      .update(lessons)
      .set({ status })
      .where(and(eq(lessons.id, id), eq(lessons.organizationId, organizationId)))
      .returning();
    return row;
  },

  updateLesson: async (
    id: string,
    organizationId: string,
    patch: Partial<
      Pick<NewLesson, "tutorId" | "subjectId" | "startsAt" | "endsAt" | "notes">
    >,
  ): Promise<Lesson | undefined> => {
    const [row] = await db
      .update(lessons)
      .set(patch)
      .where(and(eq(lessons.id, id), eq(lessons.organizationId, organizationId)))
      .returning();
    return row;
  },

  findInRangeOverlapping: async (
    params: FindLessonsInRangeParams,
  ): Promise<Lesson[]> => {
    const { from, to, studentId, tutorId, organizationId } = params;
    const conditions = [overlapRange(from, to), eq(lessons.organizationId, organizationId)];
    if (studentId !== undefined) {
      conditions.push(eq(lessons.studentId, studentId));
    }
    if (tutorId !== undefined) {
      conditions.push(eq(lessons.tutorId, tutorId));
    }
    return db
      .select()
      .from(lessons)
      .where(and(...conditions))
      .orderBy(asc(lessons.startsAt), asc(lessons.id));
  },

  findInRangeForParentStudents: async (params: {
    organizationId: string;
    from: Date;
    to: Date;
    studentIds: string[];
  }): Promise<Lesson[]> => {
    const { from, to, studentIds, organizationId } = params;
    if (studentIds.length === 0) {
      return [];
    }
    return db
      .select()
      .from(lessons)
      .where(
        and(
          overlapRange(from, to),
          inArray(lessons.studentId, studentIds),
          eq(lessons.organizationId, organizationId),
        ),
      )
      .orderBy(asc(lessons.startsAt), asc(lessons.id));
  },

  findInRangeForTutorAccess: async (params: {
    organizationId: string;
    from: Date;
    to: Date;
    tutorUserId: string;
    assignedStudentIds: string[];
  }): Promise<Lesson[]> => {
    const { from, to, tutorUserId, assignedStudentIds, organizationId } = params;
    const scope =
      assignedStudentIds.length > 0
        ? or(
            eq(lessons.tutorId, tutorUserId),
            inArray(lessons.studentId, assignedStudentIds),
          )
        : eq(lessons.tutorId, tutorUserId);
    return db
      .select()
      .from(lessons)
      .where(and(overlapRange(from, to), scope, eq(lessons.organizationId, organizationId)))
      .orderBy(asc(lessons.startsAt), asc(lessons.id));
  },
};
