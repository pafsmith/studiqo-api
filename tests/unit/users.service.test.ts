// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import type { User } from "../../src/db/schema.js";
import { usersService } from "../../src/modules/users/users.service.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository.js";
import { BadRequestError, NotFoundError } from "../../src/common/errors/errors.js";

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
    getUserById: vi.fn(),
    getUserByIdInOrganization: vi.fn(),
    getUserByEmail: vi.fn(),
    updateUser: vi.fn(),
    deleteUserById: vi.fn(),
  },
}));

vi.mock("../../src/modules/organizations/organizations.repository.js", () => ({
  organizationsRepository: {
    findMembership: vi.fn(),
    createMembership: vi.fn(),
  },
}));

function reqWithUser(user: User): Request {
  return {
    user,
    organizationId: "org-1",
    organizationRole: "org_admin",
  } as Request;
}

describe("usersService updateUser", () => {
  const adminUser: User = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    isSuperadmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingUser: User = {
    id: "user-1",
    email: "u@b.com",
    hasedPassword: "h",
    isSuperadmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(usersRepository.getUserById).mockReset();
    vi.mocked(usersRepository.getUserByIdInOrganization).mockReset();
    vi.mocked(usersRepository.getUserByEmail).mockReset();
    vi.mocked(usersRepository.updateUser).mockReset();
    vi.mocked(organizationsRepository.findMembership).mockReset();
    vi.mocked(organizationsRepository.createMembership).mockReset();
  });

  it("returns 404 when user does not exist", async () => {
    vi.mocked(usersRepository.getUserByIdInOrganization).mockResolvedValue(undefined);

    await expect(
      usersService.updateUser(reqWithUser(adminUser), "missing-id", { role: "tutor" }),
    ).rejects.toThrow(NotFoundError);

    expect(usersRepository.updateUser).not.toHaveBeenCalled();
  });

  it("rejects duplicate email", async () => {
    vi.mocked(usersRepository.getUserByIdInOrganization).mockResolvedValue(
      existingUser,
    );
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
      id: "other-user",
      email: "taken@b.com",
      hasedPassword: "h",
      isSuperadmin: false,
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
    vi.mocked(usersRepository.getUserByIdInOrganization).mockResolvedValue(
      existingUser,
    );
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(existingUser);
    vi.mocked(usersRepository.updateUser).mockResolvedValue({
      ...existingUser,
      email: "u@b.com",
    });
    vi.mocked(organizationsRepository.findMembership).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-1",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
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
    vi.mocked(usersRepository.getUserByIdInOrganization).mockResolvedValue(
      existingUser,
    );
    vi.mocked(usersRepository.updateUser).mockResolvedValue({
      ...existingUser,
    });
    vi.mocked(organizationsRepository.findMembership)
      .mockResolvedValueOnce({
        organizationId: "org-1",
        userId: "user-1",
        role: "parent",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        organizationId: "org-1",
        userId: "user-1",
        role: "tutor",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    vi.mocked(organizationsRepository.createMembership).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-1",
      role: "tutor",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const out = await usersService.updateUser(reqWithUser(adminUser), "user-1", {
      role: "tutor",
    });

    expect(usersRepository.updateUser).toHaveBeenCalledWith("user-1", {});
    expect(organizationsRepository.createMembership).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      role: "tutor",
    });
    expect(out.role).toBe("tutor");
  });
});

describe("usersService deleteUser", () => {
  const adminUser: User = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    isSuperadmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(usersRepository.deleteUserById).mockReset();
    vi.mocked(usersRepository.getUserByIdInOrganization).mockReset();
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(usersRepository.getUserByIdInOrganization).mockResolvedValue(undefined);

    await expect(
      usersService.deleteUser(reqWithUser(adminUser), "missing-id"),
    ).rejects.toThrow(NotFoundError);

    expect(usersRepository.deleteUserById).not.toHaveBeenCalled();
  });

  it("deletes when admin and user exists", async () => {
    vi.mocked(usersRepository.getUserByIdInOrganization).mockResolvedValue({
      id: "user-1",
      email: "u@b.com",
      hasedPassword: "h",
      isSuperadmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(usersRepository.deleteUserById).mockResolvedValue(true);

    await usersService.deleteUser(reqWithUser(adminUser), "user-1");

    expect(usersRepository.deleteUserById).toHaveBeenCalledWith("user-1");
  });
});
