import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { subjects, users } from "../../src/db/schema.js";
import { insertUserWithRole, loginUser, paths, registerUser } from "./helpers.js";

describe("POST /api/v1/subjects", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `subjects-post-admin-${runId}@example.com`;
  const tutorEmail = `subjects-post-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let tutorId: string | null = null;
  let subjectId: string | null = null;

  afterEach(async () => {
    if (subjectId) {
      await db.delete(subjects).where(eq(subjects.id, subjectId));
      subjectId = null;
    }
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app)
      .post(paths.subjects)
      .send({ name: "Physics" })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when name is empty", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ name: "" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 400 when body is invalid", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${session.token}`)
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 403 for a non-admin", async () => {
    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;
    const tutorSession = await loginUser(tutorEmail);

    const res = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .send({ name: "History" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/admin access required/i);
  });

  it("returns 201 and the created subject for an admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ name: "Biology" })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      name: "Biology",
    });
    expect(typeof res.body.id).toBe("string");
    subjectId = res.body.id;
  });
});
