import { and, asc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { lessons, type Lesson, type NewLesson } from "../../db/schema.js";

function overlapRange(from: Date, to: Date) {
  return and(lt(lessons.startsAt, to), gt(lessons.endsAt, from));
}

export type FindLessonsInRangeParams = {
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

  findById: async (id: string): Promise<Lesson | undefined> => {
    const [row] = await db.select().from(lessons).where(eq(lessons.id, id));
    return row;
  },

  findInRangeOverlapping: async (
    params: FindLessonsInRangeParams,
  ): Promise<Lesson[]> => {
    const { from, to, studentId, tutorId } = params;
    const conditions = [overlapRange(from, to)];
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
    from: Date;
    to: Date;
    studentIds: string[];
  }): Promise<Lesson[]> => {
    const { from, to, studentIds } = params;
    if (studentIds.length === 0) {
      return [];
    }
    return db
      .select()
      .from(lessons)
      .where(and(overlapRange(from, to), inArray(lessons.studentId, studentIds)))
      .orderBy(asc(lessons.startsAt), asc(lessons.id));
  },

  findInRangeForTutorAccess: async (params: {
    from: Date;
    to: Date;
    tutorUserId: string;
    assignedStudentIds: string[];
  }): Promise<Lesson[]> => {
    const { from, to, tutorUserId, assignedStudentIds } = params;
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
      .where(and(overlapRange(from, to), scope))
      .orderBy(asc(lessons.startsAt), asc(lessons.id));
  },
};
