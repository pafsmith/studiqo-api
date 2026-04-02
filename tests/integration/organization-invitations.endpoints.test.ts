import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { organizationInvitations, users } from "../../src/db/schema.js";
import { insertUserWithRole, loginUser, registerUser } from "./helpers.js";

vi.mock("../../src/modules/invitations/invitations.email.js", () => ({
  invitationsEmailService: {
    sendParentInvitationEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

function invitesPath(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/invites`;
}

function resendInvitePath(organizationId: string, invitationId: string): string {
  return `/api/v1/organizations/${organizationId}/invites/${invitationId}/resend`;
}

function revokeInvitePath(organizationId: string, invitationId: string): string {
  return `/api/v1/organizations/${organizationId}/invites/${invitationId}/revoke`;
}

describe("Organization invitation lifecycle endpoints", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `invite-admin-${runId}@example.com`;
  const tutorEmail = `invite-tutor-${runId}@example.com`;

  let adminId: string | null = null;
  let tutorId: string | null = null;
  let organizationId: string | null = null;
  let createdInvitationIds: string[] = [];

  afterEach(async () => {
    if (createdInvitationIds.length > 0) {
      await db
        .delete(organizationInvitations)
        .where(inArray(organizationInvitations.id, createdInvitationIds));
      createdInvitationIds = [];
    }
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
    organizationId = null;
  });

  it("creates and lists invitations for org_admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;

    const session = await loginUser(adminEmail);
    organizationId = session.activeOrganizationId ?? null;
    expect(organizationId).toBeTruthy();

    const create = await request(app)
      .post(invitesPath(String(organizationId)))
      .set("Authorization", `Bearer ${session.token}`)
      .send({ email: `invite-parent-${runId}@example.com` })
      .expect(201)
      .expect("Content-Type", /json/);

    createdInvitationIds.push(create.body.id);
    expect(create.body).toMatchObject({
      organizationId,
      email: `invite-parent-${runId}@example.com`,
      role: "parent",
    });

    const list = await request(app)
      .get(invitesPath(String(organizationId)))
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((item: { id: string }) => item.id === create.body.id)).toBe(
      true,
    );
  });

  it("returns 403 when tutor attempts to create invitation", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;

    const adminSession = await loginUser(adminEmail);
    organizationId = adminSession.activeOrganizationId ?? null;
    expect(organizationId).toBeTruthy();

    const tutor = await insertUserWithRole(tutorEmail, "tutor", String(organizationId));
    tutorId = tutor.id;
    const tutorSession = await loginUser(tutorEmail);

    const res = await request(app)
      .post(invitesPath(String(organizationId)))
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .send({ email: `invite-parent-403-${runId}@example.com` })
      .expect(403)
      .expect("Content-Type", /json/);

    expect(res.body.error).toMatch(/organization admin/i);
  });

  it("resends invitation by creating a new invite and revoking old", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;

    const session = await loginUser(adminEmail);
    organizationId = session.activeOrganizationId ?? null;
    expect(organizationId).toBeTruthy();

    const create = await request(app)
      .post(invitesPath(String(organizationId)))
      .set("Authorization", `Bearer ${session.token}`)
      .send({ email: `invite-parent-resend-${runId}@example.com` })
      .expect(201);

    createdInvitationIds.push(create.body.id);

    const resend = await request(app)
      .post(resendInvitePath(String(organizationId), create.body.id))
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    createdInvitationIds.push(resend.body.id);
    expect(resend.body.id).not.toBe(create.body.id);

    const list = await request(app)
      .get(invitesPath(String(organizationId)))
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);

    const oldInvite = list.body.find(
      (item: { id: string }) => item.id === create.body.id,
    );
    const newInvite = list.body.find(
      (item: { id: string }) => item.id === resend.body.id,
    );

    expect(oldInvite?.revokedAt).toBeTruthy();
    expect(newInvite?.revokedAt).toBeNull();
  });

  it("revokes invitation and keeps revoke idempotent", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;

    const session = await loginUser(adminEmail);
    organizationId = session.activeOrganizationId ?? null;
    expect(organizationId).toBeTruthy();

    const create = await request(app)
      .post(invitesPath(String(organizationId)))
      .set("Authorization", `Bearer ${session.token}`)
      .send({ email: `invite-parent-revoke-${runId}@example.com` })
      .expect(201);

    createdInvitationIds.push(create.body.id);

    const revoke = await request(app)
      .post(revokeInvitePath(String(organizationId), create.body.id))
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(revoke.body.id).toBe(create.body.id);
    expect(revoke.body.revokedAt).toBeTruthy();

    const revokeAgain = await request(app)
      .post(revokeInvitePath(String(organizationId), create.body.id))
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(revokeAgain.body.id).toBe(create.body.id);
    expect(revokeAgain.body.revokedAt).toBeTruthy();
  });
});
