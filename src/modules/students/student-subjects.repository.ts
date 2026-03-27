import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { NewStudentSubject, StudentSubject, studentSubjects } from "../../db/schema.js";

export const studentSubjectsRepository = {
  findByStudentAndSubject: async (
    studentId: string,
    subjectId: string,
  ): Promise<StudentSubject | undefined> => {
    const [row] = await db
      .select()
      .from(studentSubjects)
      .where(
        and(
          eq(studentSubjects.studentId, studentId),
          eq(studentSubjects.subjectId, subjectId),
        ),
      );
    return row;
  },

  insertStudentSubject: async (row: NewStudentSubject): Promise<StudentSubject> => {
    const [created] = await db.insert(studentSubjects).values(row).returning();
    return created;
  },
};
