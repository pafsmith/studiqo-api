import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { NewStudent, Student, students } from "../../db/schema.js";

export const studentsRepository = {
  createStudent: async (student: NewStudent): Promise<Student> => {
    const [result] = await db.insert(students).values(student).returning();
    return result;
  },

  findStudentById: async (id: string): Promise<Student | undefined> => {
    const [row] = await db.select().from(students).where(eq(students.id, id));
    return row;
  },

  updateStudent: async (
    id: string,
    patch: Partial<
      Pick<NewStudent, "parentId" | "tutorId" | "firstName" | "lastName" | "dateOfBirth">
    >,
  ): Promise<Student | undefined> => {
    const [row] = await db
      .update(students)
      .set(patch)
      .where(eq(students.id, id))
      .returning();
    return row;
  },

  findAllStudents: async (): Promise<Student[]> => {
    return db.select().from(students);
  },

  findStudentsByParentId: async (parentId: string): Promise<Student[]> => {
    return db.select().from(students).where(eq(students.parentId, parentId));
  },

  deleteStudentById: async (id: string): Promise<boolean> => {
    const deleted = await db
      .delete(students)
      .where(eq(students.id, id))
      .returning({ id: students.id });
    return deleted.length > 0;
  },
};
