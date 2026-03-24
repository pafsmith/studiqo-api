import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { NewStudent, Student, students } from "../../db/schema.js";

export const studentsRepository = {
  createStudent: async (student: NewStudent): Promise<Student> => {
    const [result] = await db
      .insert(students)
      .values(student)
      .returning();
    return result;
  },

  findAllStudents: async (): Promise<Student[]> => {
    return db.select().from(students);
  },

  findStudentsByParentId: async (parentId: string): Promise<Student[]> => {
    return db.select().from(students).where(eq(students.parentId, parentId));
  },
};