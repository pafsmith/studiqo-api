import { db } from "../../db/index.js";
import { lessons, type Lesson, type NewLesson } from "../../db/schema.js";

export const lessonsRepository = {
  create: async (row: NewLesson): Promise<Lesson> => {
    const [result] = await db.insert(lessons).values(row).returning();
    return result;
  },
};
