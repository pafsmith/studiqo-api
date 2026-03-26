import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import type { User } from "../../src/db/schema.js";
import {
  requireAdmin,
  requireAdminUser,
} from "../../src/common/middleware/authenticate.middleware.js";
import {
  UserForbiddenError,
  UserNotAuthenticatedError,
} from "../../src/common/errors/errors.js";

function reqWithUser(user: User | undefined): Request {
  return { user } as Request;
}

describe("requireAdminUser", () => {
  const admin: User = {
    id: "a1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tutor: User = {
    id: "t1",
    email: "t@b.com",
    hasedPassword: "h",
    role: "tutor",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("throws UserNotAuthenticatedError when req.user is missing", () => {
    expect(() => requireAdminUser(reqWithUser(undefined))).toThrow(
      UserNotAuthenticatedError,
    );
  });

  it("throws UserForbiddenError when user is not an admin", () => {
    expect(() => requireAdminUser(reqWithUser(tutor))).toThrow(UserForbiddenError);
  });

  it("returns the user when they are an admin", () => {
    expect(requireAdminUser(reqWithUser(admin))).toEqual(admin);
  });
});

describe("requireAdmin middleware", () => {
  const admin: User = {
    id: "a1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const parent: User = {
    id: "p1",
    email: "p@b.com",
    hasedPassword: "h",
    role: "parent",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("calls next with UserForbiddenError when user is not admin", () => {
    const next = vi.fn();
    requireAdmin(reqWithUser(parent), {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UserForbiddenError);
  });

  it("calls next() with no args when user is admin", () => {
    const next = vi.fn();
    requireAdmin(reqWithUser(admin), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
});
