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
};