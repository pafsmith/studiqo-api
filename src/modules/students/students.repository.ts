import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { NewStudent, Student, students } from "../../db/schema.js";

export const studentsRepository = {
  createStudent: async (student: NewStudent): Promise<Student> => {
    const [result] = await db.insert(students).values(student).returning();
    return result;
  },

  findStudentById: async (
    id: string,
    organizationId: string,
  ): Promise<Student | undefined> => {
    const [row] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)));
    return row;
  },

  updateStudent: async (
    id: string,
    organizationId: string,
    patch: Partial<
      Pick<
        NewStudent,
        "parentId" | "tutorId" | "firstName" | "lastName" | "dateOfBirth"
      >
    >,
  ): Promise<Student | undefined> => {
    const [row] = await db
      .update(students)
      .set(patch)
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)))
      .returning();
    return row;
  },

  findAllStudents: async (organizationId: string): Promise<Student[]> => {
    return db
      .select()
      .from(students)
      .where(eq(students.organizationId, organizationId));
  },

  findStudentsByParentId: async (
    parentId: string,
    organizationId: string,
  ): Promise<Student[]> => {
    return db
      .select()
      .from(students)
      .where(
        and(eq(students.parentId, parentId), eq(students.organizationId, organizationId)),
      );
  },

  findStudentByTutorId: async (tutorId: string, organizationId: string): Promise<Student[]> => {
    return db
      .select()
      .from(students)
      .where(and(eq(students.tutorId, tutorId), eq(students.organizationId, organizationId)));
  },

  deleteStudentById: async (id: string, organizationId: string): Promise<boolean> => {
    const deleted = await db
      .delete(students)
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)))
      .returning({ id: students.id });
    return deleted.length > 0;
  },
};
