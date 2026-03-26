import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
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
    expect(authService.validateJWT(token, secret)).toBe("user-123");
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
  });

  it("rejects duplicate email", async () => {
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
      id: "existing-id",
      email: "a@b.com",
      hasedPassword: "hash",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.registerUser({ email: "a@b.com", password: "Aa1!aaaa" }),
    ).rejects.toThrow(BadRequestError);

    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });

  it("creates user with trimmed lowercase lookup email", async () => {
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(undefined);
    const createdAt = new Date();
    vi.mocked(usersRepository.createUser).mockResolvedValue({
      id: "new-id",
      email: "User@Example.com",
      hasedPassword: "stored-hash",
      role: "admin",
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
      role: "admin",
      createdAt,
    });
  });
});

describe("authService loginUser", () => {
  beforeEach(() => {
    vi.mocked(usersRepository.getUserByEmail).mockReset();
    vi.mocked(authRepository.createRefreshToken).mockReset();
  });

  it("rejects unknown user", async () => {
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(undefined);

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
      role: "admin",
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
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
    expect(authService.validateJWT(out.token, config.jwt.secret)).toBe("user-uuid");
  });
});

describe("authService getMe", () => {
  it("maps the authenticated user to the API response", () => {
    const createdAt = new Date();
    const user = {
      id: "uid-1",
      email: "me@example.com",
      hasedPassword: "h",
      role: "admin" as const,
      createdAt,
      updatedAt: createdAt,
    };

    const me = authService.getMe(user);
    expect(me).toEqual({
      id: "uid-1",
      email: "me@example.com",
      role: "admin",
      createdAt,
    });
  });
});
