import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { organizationsService } from "../../src/modules/organizations/organizations.service.js";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { NotFoundError, UserForbiddenError } from "../../src/common/errors/errors.js";
import type { User } from "../../src/db/schema.js";

vi.mock("../../src/modules/organizations/organizations.repository.js", () => ({
  organizationsRepository: {
    findOrganizationBySlug: vi.fn(),
    createOrganization: vi.fn(),
    createMembership: vi.fn(),
    listOrganizations: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    findOrganizationById: vi.fn(),
    listMembershipsForOrganization: vi.fn(),
  },
}));

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
    getUserById: vi.fn(),
  },
}));

function reqWithUser(
  user: Omit<User, "isSuperadmin"> & { isSuperadmin?: boolean },
  organizationId = "org-1",
): Request {
  return {
    user: {
      ...user,
      isSuperadmin: user.isSuperadmin ?? false,
    } as User,
    organizationId,
    organizationRole: user.role === "admin" ? "org_admin" : user.role,
  } as Request;
}

describe("organizationsService", () => {
  beforeEach(() => {
    vi.mocked(organizationsRepository.findOrganizationBySlug).mockReset();
    vi.mocked(organizationsRepository.createOrganization).mockReset();
    vi.mocked(organizationsRepository.createMembership).mockReset();
    vi.mocked(organizationsRepository.listOrganizations).mockReset();
    vi.mocked(organizationsRepository.listOrganizationsForUser).mockReset();
    vi.mocked(organizationsRepository.findOrganizationById).mockReset();
    vi.mocked(organizationsRepository.listMembershipsForOrganization).mockReset();
    vi.mocked(usersRepository.getUserById).mockReset();
  });

  it("creates an organization and memberships creator as org_admin", async () => {
    vi.mocked(organizationsRepository.findOrganizationBySlug).mockResolvedValue(
      undefined,
    );
    vi.mocked(organizationsRepository.createOrganization).mockResolvedValue({
      id: "org-2",
      name: "Center Two",
      slug: "center-two",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(organizationsRepository.createMembership).mockResolvedValue({
      organizationId: "org-2",
      userId: "admin-1",
      role: "org_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const out = await organizationsService.createOrganization(
      reqWithUser({
        id: "admin-1",
        email: "admin@example.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      { name: "Center Two", slug: "center-two" },
    );

    expect(out.id).toBe("org-2");
    expect(organizationsRepository.createMembership).toHaveBeenCalledWith({
      organizationId: "org-2",
      userId: "admin-1",
      role: "org_admin",
    });
  });

  it("lists organizations for a regular user from memberships", async () => {
    vi.mocked(organizationsRepository.listOrganizationsForUser).mockResolvedValue([
      {
        id: "org-1",
        name: "Default Organization",
        slug: "default-organization",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const out = await organizationsService.listMyOrganizations(
      reqWithUser({
        id: "parent-1",
        email: "parent@example.com",
        hasedPassword: "h",
        role: "parent",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    expect(out).toHaveLength(1);
    expect(organizationsRepository.listOrganizationsForUser).toHaveBeenCalledWith(
      "parent-1",
    );
  });

  it("forbids non-superadmin from adding members to another organization", async () => {
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-2",
      name: "Org Two",
      slug: "org-two",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      organizationsService.addOrganizationMember(
        reqWithUser(
          {
            id: "admin-1",
            email: "admin@example.com",
            hasedPassword: "h",
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          "org-1",
        ),
        "org-2",
        { userId: "user-2", role: "parent" },
      ),
    ).rejects.toThrow(UserForbiddenError);
  });

  it("returns 404 when listing members for unknown organization", async () => {
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue(
      undefined,
    );

    await expect(
      organizationsService.listOrganizationMembers(
        reqWithUser({
          id: "super-1",
          email: "super@example.com",
          hasedPassword: "h",
          role: "admin",
          isSuperadmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        "org-404",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
