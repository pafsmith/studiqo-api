import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  type NewOrganizationInvitation,
  type OrganizationInvitation,
  type OrganizationMembershipRole,
  organizationInvitations,
} from "../../db/schema.js";

export const invitationsRepository = {
  createInvitation: async (
    input: NewOrganizationInvitation,
  ): Promise<OrganizationInvitation> => {
    const [row] = await db.insert(organizationInvitations).values(input).returning();
    return row;
  },

  findActiveInvitationByTokenHash: async (
    tokenHash: string,
    now: Date = new Date(),
  ): Promise<OrganizationInvitation | undefined> => {
    const [row] = await db
      .select()
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.tokenHash, tokenHash),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, now),
        ),
      )
      .limit(1);
    return row;
  },

  findLatestActiveInvitationForEmailAndRole: async (
    organizationId: string,
    email: string,
    role: OrganizationMembershipRole,
    now: Date = new Date(),
  ): Promise<OrganizationInvitation | undefined> => {
    const [row] = await db
      .select()
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, organizationId),
          eq(organizationInvitations.email, email),
          eq(organizationInvitations.role, role),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, now),
        ),
      )
      .orderBy(
        desc(organizationInvitations.createdAt),
        desc(organizationInvitations.id),
      )
      .limit(1);
    return row;
  },

  findInvitationById: async (
    invitationId: string,
  ): Promise<OrganizationInvitation | undefined> => {
    const [row] = await db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.id, invitationId))
      .limit(1);
    return row;
  },

  listInvitationsForOrganization: async (
    organizationId: string,
  ): Promise<OrganizationInvitation[]> => {
    return db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.organizationId, organizationId))
      .orderBy(
        desc(organizationInvitations.createdAt),
        desc(organizationInvitations.id),
      );
  },

  markInvitationAccepted: async (
    invitationId: string,
    acceptedByUserId: string,
  ): Promise<OrganizationInvitation | undefined> => {
    const [row] = await db
      .update(organizationInvitations)
      .set({
        acceptedAt: new Date(),
        acceptedByUserId,
      })
      .where(eq(organizationInvitations.id, invitationId))
      .returning();
    return row;
  },

  revokeInvitation: async (
    invitationId: string,
  ): Promise<OrganizationInvitation | undefined> => {
    const [row] = await db
      .update(organizationInvitations)
      .set({ revokedAt: new Date() })
      .where(eq(organizationInvitations.id, invitationId))
      .returning();
    return row;
  },
};
