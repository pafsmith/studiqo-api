import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { users } from "../../src/db/schema.js";
import { insertUserWithRole, loginUser, paths, registerUser } from "./helpers.js";

describe("GET /api/v1/students", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `students-list-admin-${runId}@example.com`;
  const parentEmail = `students-list-parent-${runId}@example.com`;
  const tutorEmail = `students-list-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let parentId: string | null = null;
  let tutorId: string | null = null;

  afterEach(async () => {
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
    if (parentId) {
      await db.delete(users).where(eq(users.id, parentId));
      parentId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app).get(paths.students).expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 403 for a tutor", async () => {
    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;
    const session = await loginUser(tutorEmail);

    const res = await request(app)
      .get(paths.students)
      .set("Authorization", `Bearer ${session.token}`)
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/forbidden|only admins and parents/i);
  });

  it("returns 200 and an empty list for an admin with no students", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .get(paths.students)
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toEqual([]);
  });

  it("returns 200 and only the parent's students for a parent user", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);

    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const dob = "2013-04-05T12:00:00.000Z";
    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Kid",
        lastName: "One",
        dateOfBirth: dob,
      })
      .expect(201);

    const parentSession = await loginUser(parentEmail);

    const res = await request(app)
      .get(paths.students)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: createRes.body.id,
      parentId: parent.id,
      firstName: "Kid",
      lastName: "One",
    });
    expect(res.body[0].dateOfBirth).toBeDefined();
  });
});

describe("POST /api/v1/students", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `students-post-admin-${runId}@example.com`;
  const parentEmail = `students-post-parent-${runId}@example.com`;
  let adminId: string | null = null;
  let parentId: string | null = null;

  afterEach(async () => {
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
    if (parentId) {
      await db.delete(users).where(eq(users.id, parentId));
      parentId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app)
      .post(paths.students)
      .send({
        parentId: "00000000-0000-4000-8000-000000000001",
        firstName: "A",
        lastName: "B",
        dateOfBirth: "2012-01-01T00:00:00.000Z",
      })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 403 when the caller is not an admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;
    const parentSession = await loginUser(parentEmail);

    const res = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "A",
        lastName: "B",
        dateOfBirth: "2012-01-01T00:00:00.000Z",
      })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/only admins can create/i);
  });

  it("returns 400 when body fails validation", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        parentId: "not-a-uuid",
        firstName: "",
        lastName: "B",
        dateOfBirth: "2012-01-01T00:00:00.000Z",
      })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 404 when parentId does not exist", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        parentId: "00000000-0000-4000-8000-000000000099",
        firstName: "A",
        lastName: "B",
        dateOfBirth: "2012-01-01T00:00:00.000Z",
      })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.error).toMatch(/parent not found/i);
  });

  it("returns 403 when parentId refers to a non-parent user", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${session.token}`)
      .send({
        parentId: reg.id,
        firstName: "A",
        lastName: "B",
        dateOfBirth: "2012-01-01T00:00:00.000Z",
      })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/only parents can be linked/i);
  });

  it("returns 201 and the student payload for a valid body", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);

    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const dob = "2014-06-07T08:00:00.000Z";
    const res = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Jane",
        lastName: "Student",
        dateOfBirth: dob,
      })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      parentId: parent.id,
      firstName: "Jane",
      lastName: "Student",
    });
    expect(typeof res.body.id).toBe("string");
    expect(res.body.dateOfBirth).toBeDefined();
  });
});

describe("PUT /api/v1/students/:studentId", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `students-put-admin-${runId}@example.com`;
  const parentEmail = `students-put-parent-${runId}@example.com`;
  const tutorEmail = `students-put-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let parentId: string | null = null;
  let tutorId: string | null = null;

  afterEach(async () => {
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
    if (parentId) {
      await db.delete(users).where(eq(users.id, parentId));
      parentId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app)
      .put(`${paths.students}/00000000-0000-4000-8000-000000000001`)
      .send({ firstName: "X" })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when no fields are provided", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .put(`${paths.students}/00000000-0000-4000-8000-000000000001`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 404 when the student does not exist", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .put(`${paths.students}/00000000-0000-4000-8000-000000000088`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ firstName: "Ghost" })
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.error).toMatch(/student not found/i);
  });

  it("returns 403 for a tutor", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;
    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;

    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Kid",
        lastName: "One",
        dateOfBirth: "2013-04-05T12:00:00.000Z",
      })
      .expect(201);

    const tutorSession = await loginUser(tutorEmail);

    const res = await request(app)
      .put(`${paths.students}/${createRes.body.id}`)
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .send({ firstName: "X" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/forbidden|only admins can update/i);
  });

  it("returns 403 for a parent", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Pat",
        lastName: "Child",
        dateOfBirth: "2015-01-02T12:00:00.000Z",
      })
      .expect(201);

    const parentSession = await loginUser(parentEmail);

    const res = await request(app)
      .put(`${paths.students}/${createRes.body.id}`)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .send({ firstName: "Patricia" })
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/forbidden|only admins can update/i);
  });

  it("returns 200 and updated fields for an admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Jane",
        lastName: "Student",
        dateOfBirth: "2014-06-07T08:00:00.000Z",
      })
      .expect(201);

    const res = await request(app)
      .put(`${paths.students}/${createRes.body.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ firstName: "Janet", lastName: "Updated" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      id: createRes.body.id,
      parentId: parent.id,
      firstName: "Janet",
      lastName: "Updated",
    });
  });
});

describe("DELETE /api/v1/students/:studentId", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `students-del-admin-${runId}@example.com`;
  const parentEmail = `students-del-parent-${runId}@example.com`;
  const tutorEmail = `students-del-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let parentId: string | null = null;
  let tutorId: string | null = null;

  afterEach(async () => {
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
    if (parentId) {
      await db.delete(users).where(eq(users.id, parentId));
      parentId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app)
      .delete(`${paths.students}/00000000-0000-4000-8000-000000000001`)
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when studentId is not a valid uuid", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .delete(`${paths.students}/not-a-uuid`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });

  it("returns 404 when the student does not exist", async () => {
    const reg = await registerUser(adminEmail);
    adminId = reg.id;
    const session = await loginUser(adminEmail);

    const res = await request(app)
      .delete(`${paths.students}/00000000-0000-4000-8000-000000000088`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.error).toMatch(/student not found/i);
  });

  it("returns 403 for a tutor", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;
    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;

    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Kid",
        lastName: "One",
        dateOfBirth: "2013-04-05T12:00:00.000Z",
      })
      .expect(201);

    const tutorSession = await loginUser(tutorEmail);

    const res = await request(app)
      .delete(`${paths.students}/${createRes.body.id}`)
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/forbidden|only admins can delete/i);
  });

  it("returns 403 for a parent", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "Pat",
        lastName: "Child",
        dateOfBirth: "2015-01-02T12:00:00.000Z",
      })
      .expect(201);

    const parentSession = await loginUser(parentEmail);

    const res = await request(app)
      .delete(`${paths.students}/${createRes.body.id}`)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.error).toMatch(/forbidden|only admins can delete/i);
  });

  it("returns 204 and removes the student for an admin", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);
    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const createRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "To",
        lastName: "Delete",
        dateOfBirth: "2014-06-07T08:00:00.000Z",
      })
      .expect(201);

    await request(app)
      .delete(`${paths.students}/${createRes.body.id}`)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .expect(204);

    const listRes = await request(app)
      .get(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .expect(200);

    expect(listRes.body).toEqual([]);
  });
});
