import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { users } from "../../src/db/schema.js";
import { insertUserWithRole, loginUser, paths, registerUser } from "./helpers.js";

describe("PUT /api/v1/users/:userId", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `users-put-admin-${runId}@example.com`;
  const otherEmail = `users-put-other-${runId}@example.com`;
  const tutorEmail = `users-put-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let otherId: string | null = null;
  let tutorId: string | null = null;

  afterEach(async () => {
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (otherId) {
      await db.delete(users).where(eq(users.id, otherId));
      otherId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app)
      .put(`${paths.users}/00000000-0000-4000-8000-000000000001`)
      .send({ role: "tutor" })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when no fields are provided", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .put(`${paths.users}/${reg.id}`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 404 when the user does not exist", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .put(`${paths.users}/00000000-0000-4000-8000-000000000088`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ role: "tutor" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.error).toMatch(/user not found/i);
  });

  it("returns 403 for a tutor", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;
    const tutorSession = await loginUser(tutorEmail);

    const res = await request(app)
      .put(`${paths.users}/${admin.id}`)
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .send({ role: "parent" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/admin access required/i);
  });

  it("returns 400 when email is already taken by another user", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const other = await registerUser(otherEmail);
    otherId = other.id;
    const adminSession = await loginUser(adminEmail);

    const res = await request(app)
      .put(`${paths.users}/${admin.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ email: other.email })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/already exists/i);
  });

  it("returns 200 and updated fields for an admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const other = await registerUser(otherEmail);
    otherId = other.id;
    const adminSession = await loginUser(adminEmail);

    const newEmail = `users-put-renamed-${runId}@example.com`;
    const res = await request(app)
      .put(`${paths.users}/${other.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ email: newEmail, role: "tutor" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      id: other.id,
      email: newEmail,
      role: "tutor",
    });
    expect(res.body.createdAt).toBeDefined();
  });

  it("returns 200 when only role changes (no user row patch)", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const other = await registerUser(otherEmail);
    otherId = other.id;
    const adminSession = await loginUser(adminEmail);

    const res = await request(app)
      .put(`${paths.users}/${other.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ role: "tutor" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      id: other.id,
      email: other.email,
      role: "tutor",
    });
    expect(res.body.createdAt).toBeDefined();
  });
});

describe("DELETE /api/v1/users/:userId", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `users-del-admin-${runId}@example.com`;
  const otherEmail = `users-del-other-${runId}@example.com`;
  const tutorEmail = `users-del-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let otherId: string | null = null;
  let tutorId: string | null = null;

  afterEach(async () => {
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (otherId) {
      await db.delete(users).where(eq(users.id, otherId));
      otherId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app)
      .delete(`${paths.users}/00000000-0000-4000-8000-000000000001`)
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when userId is not a valid uuid", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .delete(`${paths.users}/not-a-uuid`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 404 when the user does not exist", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .delete(`${paths.users}/00000000-0000-4000-8000-000000000088`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.error).toMatch(/user not found/i);
  });

  it("returns 403 for a tutor", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const other = await registerUser(otherEmail);
    otherId = other.id;
    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;
    const tutorSession = await loginUser(tutorEmail);

    const res = await request(app)
      .delete(`${paths.users}/${other.id}`)
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/admin access required/i);
  });

  it("returns 403 for a parent", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const other = await registerUser(otherEmail);
    otherId = other.id;
    const parent = await insertUserWithRole(
      `users-del-parent-${runId}@example.com`,
      "parent",
    );
    const parentSession = await loginUser(parent.email);

    const res = await request(app)
      .delete(`${paths.users}/${other.id}`)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/admin access required/i);

    await db.delete(users).where(eq(users.id, parent.id));
  });

  it("returns 204 and removes the user for an admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const other = await registerUser(otherEmail);
    otherId = other.id;
    const adminSession = await loginUser(adminEmail);

    await request(app)
      .delete(`${paths.users}/${other.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .expect(204);

    otherId = null;

    const res = await request(app)
      .put(`${paths.users}/${other.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ role: "tutor" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.error).toMatch(/user not found/i);
  });
});
