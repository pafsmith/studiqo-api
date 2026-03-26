import { db } from "../../db/index.js";
import { NewSubject, Subject, subjects } from "../../db/schema.js";

export const subjectsRepository = {
  createSubject: async (subject: NewSubject): Promise<Subject> => {
    const [result] = await db.insert(subjects).values(subject).returning();
    return result;
  }
};
