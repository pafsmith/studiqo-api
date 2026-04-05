import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  type NewOrganization,
  type NewOrganizationMembership,
  type Organization,
  type OrganizationMembership,
  organizationMemberships,
  organizations,
  users,
} from "../../db/schema.js";

export const organizationsRepository = {
  createOrganization: async (input: NewOrganization): Promise<Organization> => {
    const [row] = await db.insert(organizations).values(input).returning();
    return row;
  },

  findOrganizationById: async (id: string): Promise<Organization | undefined> => {
    const [row] = await db.select().from(organizations).where(eq(organizations.id, id));
    return row;
  },

  findOrganizationBySlug: async (slug: string): Promise<Organization | undefined> => {
    const [row] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return row;
  },

  createMembership: async (
    input: NewOrganizationMembership,
  ): Promise<OrganizationMembership> => {
    const [row] = await db
      .insert(organizationMemberships)
      .values(input)
      .onConflictDoUpdate({
        target: [
          organizationMemberships.organizationId,
          organizationMemberships.userId,
        ],
        set: { role: input.role },
      })
      .returning();
    return row;
  },

  findMembership: async (
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | undefined> => {
    const [row] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId),
        ),
      );
    return row;
  },

  listMembershipsForOrganization: async (
    organizationId: string,
  ): Promise<Array<OrganizationMembership & { email: string }>> => {
    return db
      .select({
        organizationId: organizationMemberships.organizationId,
        userId: organizationMemberships.userId,
        role: organizationMemberships.role,
        createdAt: organizationMemberships.createdAt,
        updatedAt: organizationMemberships.updatedAt,
        email: users.email,
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(eq(organizationMemberships.organizationId, organizationId))
      .orderBy(
        asc(organizationMemberships.createdAt),
        asc(organizationMemberships.userId),
      );
  },

  listOrganizationsForUser: async (userId: string): Promise<Organization[]> => {
    return db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizationMemberships)
      .innerJoin(
        organizations,
        eq(organizationMemberships.organizationId, organizations.id),
      )
      .where(eq(organizationMemberships.userId, userId))
      .orderBy(asc(organizations.createdAt), asc(organizations.id));
  },

  listMembershipsForUser: async (userId: string): Promise<OrganizationMembership[]> => {
    return db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .orderBy(
        asc(organizationMemberships.createdAt),
        asc(organizationMemberships.organizationId),
      );
  },

  listOrganizations: async (): Promise<Organization[]> => {
    return db.select().from(organizations).orderBy(asc(organizations.createdAt));
  },
};
