import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { NewUser, User, users } from "../../db/schema.js";

/** Persistence for the `users` table. */
export const usersRepository = {
  createUser: async (user: NewUser) => {
    const [result] = await db
      .insert(users)
      .values(user)
      .onConflictDoNothing()
      .returning();
    return result;
  },

  getUserByEmail: async (email: string) => {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result;
  },

  getUserById: async (id: string) => {
    const [result] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result;
  },

  updateUser: async (
    id: string,
    patch: Partial<Pick<NewUser, "email" | "role">>,
  ): Promise<User | undefined> => {
    const [result] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return result;
  },

  deleteUserById: async (id: string): Promise<boolean> => {
    const deleted = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return deleted.length > 0;
  },
};
