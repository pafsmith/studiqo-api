import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import {
  organizationInvitations,
  organizationMemberships,
  users,
} from "../../src/db/schema.js";
import { registerUser, validPassword } from "./helpers.js";
import { hashInvitationToken } from "../../src/modules/invitations/invitations.token.js";

function invitationDetailsPath(token: string): string {
  return `/api/v1/invites/${token}`;
}

function acceptInvitationPath(token: string): string {
  return `/api/v1/invites/${token}/accept`;
}

describe("Invitation acceptance endpoints", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let createdAdminUserId: string | null = null;
  let createdAcceptedUserId: string | null = null;
  let createdInvitationId: string | null = null;

  afterEach(async () => {
    if (createdInvitationId) {
      await db
        .delete(organizationInvitations)
        .where(eq(organizationInvitations.id, createdInvitationId));
      createdInvitationId = null;
    }
    if (createdAcceptedUserId) {
      await db.delete(users).where(eq(users.id, createdAcceptedUserId));
      createdAcceptedUserId = null;
    }
    if (createdAdminUserId) {
      await db.delete(users).where(eq(users.id, createdAdminUserId));
      createdAdminUserId = null;
    }
  });

  async function seedInvitation(input?: {
    email?: string;
    revokedAt?: Date | null;
    acceptedAt?: Date | null;
    expiresAt?: Date;
  }): Promise<{ token: string; organizationId: string; email: string }> {
    const email = input?.email ?? `invitee-${runId}@example.com`;
    const adminEmail = `invite-admin-${runId}@example.com`;
    const admin = await registerUser(adminEmail);
    createdAdminUserId = admin.id;

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: validPassword })
      .expect(200);

    const organizationId = String(adminLogin.body.activeOrganizationId);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashInvitationToken(token);

    const [row] = await db
      .insert(organizationInvitations)
      .values({
        organizationId,
        invitedByUserId: admin.id,
        email,
        role: "parent",
        tokenHash,
        expiresAt: input?.expiresAt ?? new Date(Date.now() + 24 * 3600_000),
        revokedAt: input?.revokedAt ?? null,
        acceptedAt: input?.acceptedAt ?? null,
      })
      .returning();

    createdInvitationId = row.id;
    return { token, organizationId, email };
  }

  it("returns invitation details for a valid token", async () => {
    const seeded = await seedInvitation();

    const res = await request(app)
      .get(invitationDetailsPath(seeded.token))
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toMatchObject({
      organizationId: seeded.organizationId,
      email: seeded.email,
      role: "parent",
    });
    expect(res.body.organizationSlug).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();
  });

  it("returns 404 for revoked invitation token", async () => {
    const seeded = await seedInvitation({ revokedAt: new Date() });

    await request(app)
      .get(invitationDetailsPath(seeded.token))
      .expect(404)
      .expect("Content-Type", /json/);
  });

  it("accepts invitation, creates parent membership, and sets refresh cookie", async () => {
    const seeded = await seedInvitation();

    const res = await request(app)
      .post(acceptInvitationPath(seeded.token))
      .send({ password: validPassword })
      .expect(200)
      .expect("Content-Type", /json/);

    createdAcceptedUserId = res.body.id;
    expect(res.body).toMatchObject({
      email: seeded.email,
      role: "parent",
      activeOrganizationId: seeded.organizationId,
    });
    expect(typeof res.body.token).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    expect(res.headers["set-cookie"]?.[0]).toContain("studiqo_refresh=");

    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, seeded.organizationId),
          eq(organizationMemberships.userId, res.body.id),
        ),
      )
      .limit(1);
    expect(membership?.role).toBe("parent");

    const [invite] = await db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.id, String(createdInvitationId)))
      .limit(1);
    expect(invite?.acceptedAt).toBeTruthy();
    expect(invite?.acceptedByUserId).toBe(res.body.id);
  });

  it("returns 404 when accepting already-used invitation token", async () => {
    const seeded = await seedInvitation();

    const firstAccept = await request(app)
      .post(acceptInvitationPath(seeded.token))
      .send({ password: validPassword })
      .expect(200);
    createdAcceptedUserId = firstAccept.body.id;

    await request(app)
      .post(acceptInvitationPath(seeded.token))
      .send({ password: validPassword })
      .expect(404)
      .expect("Content-Type", /json/);
  });
});
