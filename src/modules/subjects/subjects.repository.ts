import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { NewSubject, Subject, subjects } from "../../db/schema.js";

export const subjectsRepository = {
  createSubject: async (subject: NewSubject): Promise<Subject> => {
    const [result] = await db.insert(subjects).values(subject).returning();
    return result;
  },

  findSubjectById: async (id: string): Promise<Subject | undefined> => {
    const [row] = await db.select().from(subjects).where(eq(subjects.id, id));
    return row;
  },

  findSubjectByIdForOrganization: async (
    id: string,
    organizationId: string,
  ): Promise<Subject | undefined> => {
    const [row] = await db
      .select()
      .from(subjects)
      .where(
        and(
          eq(subjects.id, id),
          or(
            eq(subjects.organizationId, organizationId),
            isNull(subjects.organizationId),
          ),
        ),
      );
    return row;
  },

  listForOrganization: async (organizationId: string): Promise<Subject[]> => {
    return db
      .select()
      .from(subjects)
      .where(
        or(
          eq(subjects.organizationId, organizationId),
          isNull(subjects.organizationId),
        ),
      )
      .orderBy(asc(subjects.name), asc(subjects.id));
  },
};
