import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  NewUser,
  OrganizationMembershipRole,
  User,
  organizationMemberships,
  users,
} from "../../db/schema.js";

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

  getUserByIdInOrganization: async (
    id: string,
    organizationId: string,
  ): Promise<User | undefined> => {
    const [result] = await db
      .select({
        id: users.id,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        email: users.email,
        hasedPassword: users.hasedPassword,
        isSuperadmin: users.isSuperadmin,
      })
      .from(users)
      .innerJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
      .where(
        and(
          eq(users.id, id),
          eq(organizationMemberships.organizationId, organizationId),
        ),
      )
      .limit(1);
    return result;
  },

  hasOrganizationMembership: async (
    userId: string,
    organizationId: string,
    role?: OrganizationMembershipRole,
  ): Promise<boolean> => {
    const [result] = await db
      .select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId),
          role ? eq(organizationMemberships.role, role) : undefined,
        ),
      )
      .limit(1);
    return result !== undefined;
  },

  updateUser: async (
    id: string,
    patch: Partial<Pick<NewUser, "email">>,
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
