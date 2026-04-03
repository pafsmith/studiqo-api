import { asc, count, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { emergencyContacts, NewEmergencyContact } from "../../db/schema.js";
import type { EmergencyContact } from "../../db/schema.js";

export const emergencyContactsRepository = {
  create: async (contact: NewEmergencyContact): Promise<EmergencyContact> => {
    const [result] = await db.insert(emergencyContacts).values(contact).returning();
    return result;
  },

  findById: async (id: string): Promise<EmergencyContact | undefined> => {
    const [row] = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.id, id));
    return row;
  },

  findByStudentId: async (studentId: string): Promise<EmergencyContact[]> => {
    return db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.studentId, studentId))
      .orderBy(asc(emergencyContacts.createdAt), asc(emergencyContacts.id));
  },

  countByStudentId: async (studentId: string): Promise<number> => {
    const [result] = await db
      .select({ count: count() })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.studentId, studentId));
    return result?.count ?? 0;
  },

  update: async (
    id: string,
    patch: Partial<Pick<NewEmergencyContact, "name" | "phone" | "relationship">>,
  ): Promise<EmergencyContact | undefined> => {
    const [row] = await db
      .update(emergencyContacts)
      .set(patch)
      .where(eq(emergencyContacts.id, id))
      .returning();
    return row;
  },

  deleteById: async (id: string): Promise<boolean> => {
    const deleted = await db
      .delete(emergencyContacts)
      .where(eq(emergencyContacts.id, id))
      .returning({ id: emergencyContacts.id });
    return deleted.length > 0;
  },
};
