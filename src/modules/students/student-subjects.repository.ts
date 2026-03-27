import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  NewStudentSubject,
  StudentSubject,
  studentSubjects,
  subjects,
} from "../../db/schema.js";

export interface StudentSubjectWithDetails {
  subjectId: string;
  subjectName: string;
  currentGrade: string | null;
  predictedGrade: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

  findSubjectsByStudentId: async (
    studentId: string,
  ): Promise<StudentSubjectWithDetails[]> => {
    return db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        currentGrade: studentSubjects.currentGrade,
        predictedGrade: studentSubjects.predictedGrade,
        createdAt: studentSubjects.createdAt,
        updatedAt: studentSubjects.updatedAt,
      })
      .from(studentSubjects)
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(eq(studentSubjects.studentId, studentId));
  },

  insertStudentSubject: async (row: NewStudentSubject): Promise<StudentSubject> => {
    const [created] = await db.insert(studentSubjects).values(row).returning();
    return created;
  },
};
