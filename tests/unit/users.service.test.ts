import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import type { User } from "../../src/db/schema.js";
import { usersService } from "../../src/modules/users/users.service.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import {
  BadRequestError,
  NotFoundError,
  UserForbiddenError,
} from "../../src/common/errors/errors.js";

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    updateUser: vi.fn(),
  },
}));

function reqWithUser(user: User): Request {
  return { user } as Request;
}

describe("usersService updateUser", () => {
  const adminUser = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tutorUser = {
    id: "t1",
    email: "t@b.com",
    hasedPassword: "h",
    role: "tutor" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingUser = {
    id: "user-1",
    email: "u@b.com",
    hasedPassword: "h",
    role: "parent" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(authRepository.getUserById).mockReset();
    vi.mocked(authRepository.getUserByEmail).mockReset();
    vi.mocked(authRepository.updateUser).mockReset();
  });

  it("rejects non-admins", async () => {
    await expect(
      usersService.updateUser(reqWithUser(tutorUser), "user-1", { role: "parent" }),
    ).rejects.toThrow(UserForbiddenError);

    expect(authRepository.getUserById).not.toHaveBeenCalled();
    expect(authRepository.updateUser).not.toHaveBeenCalled();
  });

  it("returns 404 when user does not exist", async () => {
    vi.mocked(authRepository.getUserById).mockResolvedValue(undefined);

    await expect(
      usersService.updateUser(reqWithUser(adminUser), "missing-id", { role: "tutor" }),
    ).rejects.toThrow(NotFoundError);

    expect(authRepository.updateUser).not.toHaveBeenCalled();
  });

  it("rejects duplicate email", async () => {
    vi.mocked(authRepository.getUserById).mockResolvedValue(existingUser);
    vi.mocked(authRepository.getUserByEmail).mockResolvedValue({
      id: "other-user",
      email: "taken@b.com",
      hasedPassword: "h",
      role: "tutor",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      usersService.updateUser(reqWithUser(adminUser), "user-1", {
        email: "taken@b.com",
      }),
    ).rejects.toThrow(BadRequestError);

    expect(authRepository.updateUser).not.toHaveBeenCalled();
  });

  it("allows same email for the same user", async () => {
    vi.mocked(authRepository.getUserById).mockResolvedValue(existingUser);
    vi.mocked(authRepository.getUserByEmail).mockResolvedValue(existingUser);
    vi.mocked(authRepository.updateUser).mockResolvedValue({
      ...existingUser,
      email: "u@b.com",
    });

    const out = await usersService.updateUser(reqWithUser(adminUser), "user-1", {
      email: "U@B.com",
    });

    expect(authRepository.updateUser).toHaveBeenCalledWith("user-1", {
      email: "u@b.com",
    });
    expect(out.email).toBe("u@b.com");
  });

  it("updates role for an admin", async () => {
    vi.mocked(authRepository.getUserById).mockResolvedValue(existingUser);
    vi.mocked(authRepository.updateUser).mockResolvedValue({
      ...existingUser,
      role: "tutor",
    });

    const out = await usersService.updateUser(reqWithUser(adminUser), "user-1", {
      role: "tutor",
    });

    expect(authRepository.updateUser).toHaveBeenCalledWith("user-1", { role: "tutor" });
    expect(out.role).toBe("tutor");
  });
});
