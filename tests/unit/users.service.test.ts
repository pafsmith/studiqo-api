import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import type { User } from "../../src/db/schema.js";
import { usersService } from "../../src/modules/users/users.service.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { BadRequestError, NotFoundError } from "../../src/common/errors/errors.js";

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    updateUser: vi.fn(),
    deleteUserById: vi.fn(),
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

  const existingUser = {
    id: "user-1",
    email: "u@b.com",
    hasedPassword: "h",
    role: "parent" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(usersRepository.getUserById).mockReset();
    vi.mocked(usersRepository.getUserByEmail).mockReset();
    vi.mocked(usersRepository.updateUser).mockReset();
  });

  it("returns 404 when user does not exist", async () => {
    vi.mocked(usersRepository.getUserById).mockResolvedValue(undefined);

    await expect(
      usersService.updateUser(reqWithUser(adminUser), "missing-id", { role: "tutor" }),
    ).rejects.toThrow(NotFoundError);

    expect(usersRepository.updateUser).not.toHaveBeenCalled();
  });

  it("rejects duplicate email", async () => {
    vi.mocked(usersRepository.getUserById).mockResolvedValue(existingUser);
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
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

    expect(usersRepository.updateUser).not.toHaveBeenCalled();
  });

  it("allows same email for the same user", async () => {
    vi.mocked(usersRepository.getUserById).mockResolvedValue(existingUser);
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(existingUser);
    vi.mocked(usersRepository.updateUser).mockResolvedValue({
      ...existingUser,
      email: "u@b.com",
    });

    const out = await usersService.updateUser(reqWithUser(adminUser), "user-1", {
      email: "U@B.com",
    });

    expect(usersRepository.updateUser).toHaveBeenCalledWith("user-1", {
      email: "u@b.com",
    });
    expect(out.email).toBe("u@b.com");
  });

  it("updates role for an admin", async () => {
    vi.mocked(usersRepository.getUserById).mockResolvedValue(existingUser);
    vi.mocked(usersRepository.updateUser).mockResolvedValue({
      ...existingUser,
      role: "tutor",
    });

    const out = await usersService.updateUser(reqWithUser(adminUser), "user-1", {
      role: "tutor",
    });

    expect(usersRepository.updateUser).toHaveBeenCalledWith("user-1", {
      role: "tutor",
    });
    expect(out.role).toBe("tutor");
  });
});

describe("usersService deleteUser", () => {
  const adminUser = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(usersRepository.deleteUserById).mockReset();
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(usersRepository.deleteUserById).mockResolvedValue(false);

    await expect(
      usersService.deleteUser(reqWithUser(adminUser), "missing-id"),
    ).rejects.toThrow(NotFoundError);

    expect(usersRepository.deleteUserById).toHaveBeenCalledWith("missing-id");
  });

  it("deletes when admin and user exists", async () => {
    vi.mocked(usersRepository.deleteUserById).mockResolvedValue(true);

    await usersService.deleteUser(reqWithUser(adminUser), "user-1");

    expect(usersRepository.deleteUserById).toHaveBeenCalledWith("user-1");
  });
});
