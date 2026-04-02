import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { config } from "../../src/config/config.js";
import { db } from "../../src/db/index.js";
import { organizations, users } from "../../src/db/schema.js";
import { loginUser, paths, registerUser, validPassword } from "./helpers.js";

describe("POST /api/v1/auth/register", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `register-test-${runId}@example.com`;
  let createdUserId: string | null = null;
  let createdOrganizationId: string | null = null;

  afterEach(async () => {
    if (createdOrganizationId) {
      await db.delete(organizations).where(eq(organizations.id, createdOrganizationId));
      createdOrganizationId = null;
    }
    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
      createdUserId = null;
    }
  });

  it("returns 201 and user payload for a valid body", async () => {
    const res = await request(app)
      .post(paths.register)
      .send({ email, password: validPassword })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      email,
    });
    expect(res.body.role).toBeUndefined();
    expect(res.body.activeOrganizationId).toBeUndefined();
    expect(typeof res.body.id).toBe("string");
    expect(res.body.createdAt).toBeDefined();
    createdUserId = res.body.id;
  });

  it("allows a newly registered user without memberships to create an organization", async () => {
    const scopedEmail = `register-org-${runId}@example.com`;
    const register = await request(app)
      .post(paths.register)
      .send({ email: scopedEmail, password: validPassword })
      .expect(201);
    createdUserId = register.body.id;

    const login = await request(app)
      .post(paths.login)
      .send({ email: scopedEmail, password: validPassword })
      .expect(200);

    const createOrg = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ name: "Fresh Org", slug: `fresh-org-${runId}` })
      .expect(201)
      .expect("Content-Type", /json/);

    createdOrganizationId = createOrg.body.id;
    expect(createOrg.body).toMatchObject({
      name: "Fresh Org",
      slug: `fresh-org-${runId}`,
    });
  });

  it("returns 400 when email is already registered", async () => {
    const res1 = await request(app)
      .post(paths.register)
      .send({ email, password: validPassword })
      .expect(201);
    createdUserId = res1.body.id;

    const res2 = await request(app)
      .post(paths.register)
      .send({ email, password: validPassword })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res2.body.error).toContain("already exists");
  });

  it("returns 400 when password fails validation", async () => {
    const otherEmail = `register-weak-${runId}@example.com`;
    const res = await request(app)
      .post(paths.register)
      .send({ email: otherEmail, password: "short" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.error).toMatch(/validation/i);
  });
});

describe("POST /api/v1/auth/login", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `login-test-${runId}@example.com`;
  let userId: string | null = null;

  afterEach(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      userId = null;
    }
  });

  it("returns 200 with tokens for valid credentials", async () => {
    const reg = await registerUser(email);
    userId = reg.id;

    const res = await request(app)
      .post(paths.login)
      .send({ email, password: validPassword })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toMatchObject({ email, id: reg.id, role: "org_admin" });
    expect(typeof res.body.token).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"]?.[0]).toContain(
      `${config.auth.refreshCookieName}=`,
    );
  });

  it("returns 400 for unknown email", async () => {
    const res = await request(app)
      .post(paths.login)
      .send({ email: `nobody-${runId}@example.com`, password: validPassword })
      .expect(400)
      .expect("Content-Type", /json/);

    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it("returns 400 for wrong password", async () => {
    const reg = await registerUser(email);
    userId = reg.id;

    const res = await request(app)
      .post(paths.login)
      .send({ email, password: "WrongPass1!" })
      .expect(400)
      .expect("Content-Type", /json/);

    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it("returns 400 when body fails validation", async () => {
    const res = await request(app)
      .post(paths.login)
      .send({ email: "not-an-email", password: "x" })
      .expect(400)
      .expect("Content-Type", /json/);

    expect(res.body.error).toMatch(/validation/i);
  });
});

describe("GET /api/v1/auth/me", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `me-test-${runId}@example.com`;
  let userId: string | null = null;

  afterEach(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      userId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app).get(paths.me).expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 200 and the current user with a valid access token", async () => {
    await registerUser(email);
    const session = await loginUser(email);
    userId = session.id;

    const res = await request(app)
      .get(paths.me)
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toMatchObject({
      id: session.id,
      email,
      role: "org_admin",
    });
    expect(res.body.createdAt).toBeDefined();
  });
});

describe("POST /api/v1/auth/refresh", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `refresh-test-${runId}@example.com`;
  let userId: string | null = null;

  afterEach(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      userId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app).post(paths.refresh).expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 404 for an unknown refresh token", async () => {
    const res = await request(app)
      .post(paths.refresh)
      .set("Authorization", "Bearer deadbeefdeadbeefdeadbeefdeadbeef")
      .expect(404)
      .expect("Content-Type", /json/);

    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 200 with a new access token using cookie auth", async () => {
    const agent = request.agent(app);
    await agent
      .post(paths.register)
      .send({ email, password: validPassword })
      .expect(201);
    const login = await agent
      .post(paths.login)
      .send({ email, password: validPassword })
      .expect(200);
    userId = login.body.id;

    const res = await agent
      .post(paths.refresh)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(typeof res.body.token).toBe("string");
    expect(res.body.refreshToken).toBeUndefined();
    const payload = jwt.decode(res.body.token) as { sub?: string; iss?: string };
    expect(payload.sub).toBe(userId);
    expect(payload.iss).toBe("studiqo");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"]?.[0]).toContain(
      `${config.auth.refreshCookieName}=`,
    );
  });

  it("returns 200 with rotated tokens for legacy Authorization header flow", async () => {
    await registerUser(email);
    const session = await loginUser(email);
    userId = session.id;

    const res = await request(app)
      .post(paths.refresh)
      .set("Authorization", `Bearer ${session.refreshToken}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(typeof res.body.token).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    const payload = jwt.decode(res.body.token) as { sub?: string; iss?: string };
    expect(payload.sub).toBe(session.id);
    expect(payload.iss).toBe("studiqo");
  });
});

describe("POST /api/v1/auth/logout", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `logout-test-${runId}@example.com`;
  let userId: string | null = null;

  afterEach(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      userId = null;
    }
  });

  it("returns 401 without Authorization", async () => {
    const res = await request(app).post(paths.logout).expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 204 and revokes the refresh token", async () => {
    await registerUser(email);
    const session = await loginUser(email);
    userId = session.id;

    await request(app)
      .post(paths.logout)
      .set("Authorization", `Bearer ${session.refreshToken}`)
      .expect(204);

    const afterLogout = await request(app)
      .post(paths.refresh)
      .set("Authorization", `Bearer ${session.refreshToken}`)
      .expect(404);

    expect(afterLogout.body.error).toMatch(/not found/i);
  });

  it("returns 204 and clears refresh cookie", async () => {
    const agent = request.agent(app);
    const runScopedEmail = `logout-cookie-${runId}@example.com`;
    const register = await agent
      .post(paths.register)
      .send({ email: runScopedEmail, password: validPassword })
      .expect(201);
    userId = register.body.id;

    await agent
      .post(paths.login)
      .send({ email: runScopedEmail, password: validPassword })
      .expect(200);

    const logout = await agent.post(paths.logout).expect(204);
    expect(logout.headers["set-cookie"]).toBeDefined();

    const afterLogout = await agent.post(paths.refresh).expect(401);
    expect(afterLogout.body.error).toBeDefined();
  });
});
