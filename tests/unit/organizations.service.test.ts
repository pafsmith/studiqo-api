import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { organizationsService } from "../../src/modules/organizations/organizations.service.js";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { invitationsRepository } from "../../src/modules/invitations/invitations.repository.js";
import { invitationsEmailService } from "../../src/modules/invitations/invitations.email.js";
import {
  ConflictError,
  NotFoundError,
  UserForbiddenError,
} from "../../src/common/errors/errors.js";
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

vi.mock("../../src/modules/invitations/invitations.repository.js", () => ({
  invitationsRepository: {
    findLatestActiveInvitationForEmailAndRole: vi.fn(),
    findInvitationById: vi.fn(),
    listInvitationsForOrganization: vi.fn(),
    createInvitation: vi.fn(),
    markInvitationAccepted: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}));

vi.mock("../../src/modules/invitations/invitations.email.js", () => ({
  invitationsEmailService: {
    sendParentInvitationEmail: vi.fn(),
  },
}));

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
    getUserById: vi.fn(),
  },
}));

type ReqUserInput = Omit<User, "isSuperadmin"> & {
  isSuperadmin?: boolean;
  role?: "admin" | "org_admin" | "tutor" | "parent";
};

function reqWithUser(user: ReqUserInput, organizationId = "org-1"): Request {
  return {
    user: {
      ...user,
      isSuperadmin: user.isSuperadmin ?? false,
    } as User,
    organizationId,
    organizationRole: user.role === "admin" ? "org_admin" : user.role,
  } as unknown as Request;
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
    vi.mocked(
      invitationsRepository.findLatestActiveInvitationForEmailAndRole,
    ).mockReset();
    vi.mocked(invitationsRepository.findInvitationById).mockReset();
    vi.mocked(invitationsRepository.listInvitationsForOrganization).mockReset();
    vi.mocked(invitationsRepository.createInvitation).mockReset();
    vi.mocked(invitationsRepository.markInvitationAccepted).mockReset();
    vi.mocked(invitationsRepository.revokeInvitation).mockReset();
    vi.mocked(invitationsEmailService.sendParentInvitationEmail).mockReset();
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

  it("creates a parent invitation for org_admin", async () => {
    const now = new Date();
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-1",
      name: "Center One",
      slug: "center-one",
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(
      invitationsRepository.findLatestActiveInvitationForEmailAndRole,
    ).mockResolvedValue(undefined);
    vi.mocked(invitationsRepository.createInvitation).mockResolvedValue({
      id: "invite-1",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 24 * 3600_000),
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsEmailService.sendParentInvitationEmail).mockResolvedValue(
      undefined,
    );

    const out = await organizationsService.createParentInvitation(
      reqWithUser({
        id: "admin-1",
        email: "admin@example.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      }),
      "org-1",
      { email: "Parent@Example.com" },
    );

    expect(out.id).toBe("invite-1");
    expect(out.role).toBe("parent");
    expect(invitationsRepository.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        invitedByUserId: "admin-1",
        email: "parent@example.com",
        role: "parent",
      }),
    );
    expect(invitationsEmailService.sendParentInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invite-1",
        organizationSlug: "center-one",
        organizationName: "Center One",
      }),
    );
  });

  it("rejects parent invitation when requester is not org_admin", async () => {
    await expect(
      organizationsService.createParentInvitation(
        reqWithUser({
          id: "tutor-1",
          email: "tutor@example.com",
          hasedPassword: "h",
          role: "tutor",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        "org-1",
        { email: "parent@example.com" },
      ),
    ).rejects.toThrow(UserForbiddenError);
  });

  it("rejects duplicate active parent invitation", async () => {
    const now = new Date();
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-1",
      name: "Center One",
      slug: "center-one",
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(
      invitationsRepository.findLatestActiveInvitationForEmailAndRole,
    ).mockResolvedValue({
      id: "invite-existing",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 24 * 3600_000),
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      organizationsService.createParentInvitation(
        reqWithUser({
          id: "admin-1",
          email: "admin@example.com",
          hasedPassword: "h",
          role: "admin",
          createdAt: now,
          updatedAt: now,
        }),
        "org-1",
        { email: "parent@example.com" },
      ),
    ).rejects.toThrow(ConflictError);
  });

  it("lists invitations for organization admin", async () => {
    const now = new Date();
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-1",
      name: "Center One",
      slug: "center-one",
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsRepository.listInvitationsForOrganization).mockResolvedValue([
      {
        id: "invite-1",
        organizationId: "org-1",
        invitedByUserId: "admin-1",
        acceptedByUserId: null,
        email: "parent@example.com",
        role: "parent",
        tokenHash: "hash",
        expiresAt: new Date(Date.now() + 3600_000),
        acceptedAt: null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const out = await organizationsService.listOrganizationInvitations(
      reqWithUser({
        id: "admin-1",
        email: "admin@example.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      }),
      "org-1",
    );

    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("invite-1");
  });

  it("resends invitation by creating a new invite and revoking old", async () => {
    const now = new Date();
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-1",
      name: "Center One",
      slug: "center-one",
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsRepository.findInvitationById).mockResolvedValue({
      id: "invite-old",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash-old",
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsRepository.createInvitation).mockResolvedValue({
      id: "invite-new",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash-new",
      expiresAt: new Date(Date.now() + 3600_000),
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsEmailService.sendParentInvitationEmail).mockResolvedValue(
      undefined,
    );
    vi.mocked(invitationsRepository.revokeInvitation).mockResolvedValue({
      id: "invite-old",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash-old",
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
      revokedAt: new Date(),
      createdAt: now,
      updatedAt: now,
    });

    const out = await organizationsService.resendOrganizationInvitation(
      reqWithUser({
        id: "admin-1",
        email: "admin@example.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      }),
      "org-1",
      "invite-old",
    );

    expect(out.id).toBe("invite-new");
    expect(invitationsRepository.revokeInvitation).toHaveBeenCalledWith("invite-old");
  });

  it("revokes invitation for org admin", async () => {
    const now = new Date();
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-1",
      name: "Center One",
      slug: "center-one",
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsRepository.findInvitationById).mockResolvedValue({
      id: "invite-1",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 3600_000),
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    vi.mocked(invitationsRepository.revokeInvitation).mockResolvedValue({
      id: "invite-1",
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      acceptedByUserId: null,
      email: "parent@example.com",
      role: "parent",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 3600_000),
      acceptedAt: null,
      revokedAt: new Date(),
      createdAt: now,
      updatedAt: now,
    });

    const out = await organizationsService.revokeOrganizationInvitation(
      reqWithUser({
        id: "admin-1",
        email: "admin@example.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      }),
      "org-1",
      "invite-1",
    );

    expect(out.id).toBe("invite-1");
    expect(out.revokedAt).toBeTruthy();
  });
});
