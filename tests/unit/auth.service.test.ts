import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository.js";
import {
  BadRequestError,
  UserNotAuthenticatedError,
} from "../../src/common/errors/errors.js";
import { config } from "../../src/config/config.js";

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    createRefreshToken: vi.fn(),
    getUserfromRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
  },
}));

vi.mock("../../src/modules/organizations/organizations.repository.js", () => ({
  organizationsRepository: {
    listMembershipsForUser: vi.fn(),
    findOrganizationBySlug: vi.fn(),
    createOrganization: vi.fn(),
    createMembership: vi.fn(),
    findMembership: vi.fn(),
  },
}));

describe("authService password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await authService.hashPassword("my-Secret1!");
    expect(hash).not.toBe("my-Secret1!");
    await expect(authService.checkPasswordHash("my-Secret1!", hash)).resolves.toBe(
      true,
    );
    await expect(authService.checkPasswordHash("wrong", hash)).resolves.toBe(false);
  });
});

describe("authService JWT helpers", () => {
  const secret = config.jwt.secret;

  it("signs and validates a token for the user id", () => {
    const token = authService.makeJWT("user-123", 60, secret);
    expect(authService.validateJWT(token, secret)).toEqual({
      userId: "user-123",
      organizationId: undefined,
    });
  });

  it("rejects invalid tokens", () => {
    expect(() => authService.validateJWT("not-a-jwt", secret)).toThrow(
      UserNotAuthenticatedError,
    );
  });

  it("rejects wrong issuer", () => {
    const bad = jwt.sign(
      { iss: "other", sub: "u1", iat: Math.floor(Date.now() / 1000), exp: 9e9 },
      secret,
      { algorithm: "HS256" },
    );
    expect(() => authService.validateJWT(bad, secret)).toThrow(
      UserNotAuthenticatedError,
    );
  });

  it("rejects tokens without sub", () => {
    const iat = Math.floor(Date.now() / 1000);
    const bad = jwt.sign({ iss: "studiqo", iat, exp: iat + 60 }, secret, {
      algorithm: "HS256",
    });
    expect(() => authService.validateJWT(bad, secret)).toThrow(
      UserNotAuthenticatedError,
    );
  });
});

describe("authService getBearerToken", () => {
  it("parses a Bearer token", () => {
    const req = {
      headers: { authorization: "Bearer abc.def.ghi" },
    } as unknown as Request;
    expect(authService.getBearerToken(req)).toBe("abc.def.ghi");
  });

  it("throws when header is missing", () => {
    const req = { headers: {} } as unknown as Request;
    expect(() => authService.getBearerToken(req)).toThrow(UserNotAuthenticatedError);
  });

  it("throws when scheme is not Bearer", () => {
    const req = {
      headers: { authorization: "Basic x" },
    } as unknown as Request;
    expect(() => authService.getBearerToken(req)).toThrow(UserNotAuthenticatedError);
  });
});

describe("authService registerUser", () => {
  beforeEach(() => {
    vi.mocked(usersRepository.getUserByEmail).mockReset();
    vi.mocked(usersRepository.createUser).mockReset();
    vi.mocked(organizationsRepository.findOrganizationBySlug).mockReset();
    vi.mocked(organizationsRepository.createMembership).mockReset();
  });

  it("rejects duplicate email", async () => {
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
      id: "existing-id",
      email: "a@b.com",
      hasedPassword: "hash",
      isSuperadmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.registerUser({ email: "a@b.com", password: "Aa1!aaaa" }),
    ).rejects.toThrow(BadRequestError);

    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });

  it("creates user with trimmed lowercase lookup email", async () => {
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(undefined as never);
    const createdAt = new Date();
    vi.mocked(usersRepository.createUser).mockResolvedValue({
      id: "new-id",
      email: "User@Example.com",
      hasedPassword: "stored-hash",
      isSuperadmin: false,
      createdAt,
      updatedAt: createdAt,
    });
    vi.mocked(organizationsRepository.findOrganizationBySlug).mockResolvedValue({
      id: "org-1",
      name: "Default Organization",
      slug: "default-organization",
      createdAt,
      updatedAt: createdAt,
    });
    vi.mocked(organizationsRepository.createMembership).mockResolvedValue({
      organizationId: "org-1",
      userId: "new-id",
      role: "org_admin",
      createdAt,
      updatedAt: createdAt,
    });

    const result = await authService.registerUser({
      email: "User@Example.com",
      password: "Aa1!aaaa",
    });

    expect(usersRepository.getUserByEmail).toHaveBeenCalledWith("user@example.com");
    expect(usersRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "User@Example.com",
        hasedPassword: expect.any(String),
      }),
    );
    expect(result).toEqual({
      id: "new-id",
      email: "User@Example.com",
      role: "org_admin",
      createdAt,
      isSuperadmin: false,
      activeOrganizationId: "org-1",
    });
  });
});

describe("authService loginUser", () => {
  beforeEach(() => {
    vi.mocked(usersRepository.getUserByEmail).mockReset();
    vi.mocked(authRepository.createRefreshToken).mockReset();
    vi.mocked(organizationsRepository.listMembershipsForUser).mockReset();
  });

  it("rejects unknown user", async () => {
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(undefined as never);

    await expect(
      authService.loginUser({ email: "nope@example.com", password: "x" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects wrong password", async () => {
    const hash = await authService.hashPassword("Correct1!");
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      hasedPassword: hash,
      isSuperadmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.loginUser({ email: "a@b.com", password: "Wrong1!" }),
    ).rejects.toThrow(BadRequestError);
    expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
  });

  it("returns access and refresh tokens on success", async () => {
    const hash = await authService.hashPassword("GoodPass1!");
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
      id: "user-uuid",
      email: "login@example.com",
      hasedPassword: hash,
      isSuperadmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(organizationsRepository.listMembershipsForUser).mockResolvedValue([
      {
        organizationId: "org-1",
        userId: "user-uuid",
        role: "org_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(authRepository.createRefreshToken).mockResolvedValue({
      token: "refresh",
      userId: "user-uuid",
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
    });

    const out = await authService.loginUser({
      email: "login@example.com",
      password: "GoodPass1!",
    });

    expect(out.token).toBeTruthy();
    expect(out.refreshToken).toBeTruthy();
    expect(authService.validateJWT(out.token, config.jwt.secret)).toEqual({
      userId: "user-uuid",
      organizationId: "org-1",
    });
  });
});

describe("authService getMe", () => {
  it("maps the authenticated user to the API response", async () => {
    const createdAt = new Date();
    const user = {
      id: "uid-1",
      email: "me@example.com",
      hasedPassword: "h",
      isSuperadmin: false,
      createdAt,
      updatedAt: createdAt,
    };
    vi.mocked(organizationsRepository.findMembership).mockResolvedValue(undefined);

    const me = await authService.getMe(user);
    expect(me).toEqual({
      id: "uid-1",
      email: "me@example.com",
      role: undefined,
      createdAt,
      isSuperadmin: false,
      activeOrganizationId: undefined,
    });
  });
});

describe("authService resolveRefreshToken", () => {
  it("prefers cookie refresh token when present", () => {
    const req = {
      cookies: { [config.auth.refreshCookieName]: "cookie-refresh" },
      headers: { authorization: "Bearer header-refresh" },
    } as unknown as Request;

    expect(authService.resolveRefreshToken(req)).toEqual({
      token: "cookie-refresh",
      source: "cookie",
    });
  });

  it("falls back to Authorization header for legacy clients", () => {
    const req = {
      cookies: {},
      headers: { authorization: "Bearer header-refresh" },
    } as unknown as Request;

    expect(authService.resolveRefreshToken(req)).toEqual({
      token: "header-refresh",
      source: "header",
    });
  });
});

describe("authService refresh/logout", () => {
  beforeEach(() => {
    vi.mocked(authRepository.getUserfromRefreshToken).mockReset();
    vi.mocked(authRepository.revokeRefreshToken).mockReset();
    vi.mocked(authRepository.createRefreshToken).mockReset();
    vi.mocked(organizationsRepository.listMembershipsForUser).mockReset();
  });

  it("rotates refresh token and returns both tokens", async () => {
    const now = new Date();
    vi.mocked(authRepository.getUserfromRefreshToken).mockResolvedValue({
      user: {
        id: "u-1",
        email: "rotate@example.com",
        hasedPassword: "hash",
        isSuperadmin: false,
        createdAt: now,
        updatedAt: now,
      },
    });
    vi.mocked(authRepository.revokeRefreshToken).mockResolvedValue(undefined);
    vi.mocked(authRepository.createRefreshToken).mockResolvedValue({
      token: "new-refresh",
      userId: "u-1",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
    });
    vi.mocked(organizationsRepository.listMembershipsForUser).mockResolvedValue([
      {
        organizationId: "org-1",
        userId: "u-1",
        role: "org_admin",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const req = {
      cookies: { [config.auth.refreshCookieName]: "old-refresh" },
      headers: {},
    } as unknown as Request;

    const out = await authService.refreshToken(req);

    expect(authRepository.getUserfromRefreshToken).toHaveBeenCalledWith("old-refresh");
    expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith("old-refresh");
    expect(authRepository.createRefreshToken).toHaveBeenCalledTimes(1);
    expect(typeof out.token).toBe("string");
    expect(typeof out.refreshToken).toBe("string");
    expect(authService.validateJWT(out.token, config.jwt.secret)).toEqual({
      userId: "u-1",
      organizationId: "org-1",
    });
  });

  it("revokes refresh token from cookie on logout", async () => {
    vi.mocked(authRepository.revokeRefreshToken).mockResolvedValue(undefined);
    const req = {
      cookies: { [config.auth.refreshCookieName]: "logout-token" },
      headers: {},
    } as unknown as Request;

    await authService.logoutUser(req);

    expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith("logout-token");
  });
});
