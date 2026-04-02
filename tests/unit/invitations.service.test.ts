import { beforeEach, describe, expect, it, vi } from "vitest";
import { invitationsService } from "../../src/modules/invitations/invitations.service.js";
import { invitationsRepository } from "../../src/modules/invitations/invitations.repository.js";
import { organizationsRepository } from "../../src/modules/organizations/organizations.repository.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { authService } from "../../src/modules/auth/auth.service.js";
import { ConflictError, NotFoundError } from "../../src/common/errors/errors.js";

vi.mock("../../src/modules/invitations/invitations.repository.js", () => ({
  invitationsRepository: {
    findActiveInvitationByTokenHash: vi.fn(),
    markInvitationAccepted: vi.fn(),
  },
}));

vi.mock("../../src/modules/organizations/organizations.repository.js", () => ({
  organizationsRepository: {
    findOrganizationById: vi.fn(),
    createMembership: vi.fn(),
  },
}));

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/auth.service.js", () => ({
  authService: {
    hashPassword: vi.fn(),
    makeJWT: vi.fn(),
    issueRefreshToken: vi.fn(),
  },
}));

describe("invitationsService", () => {
  const invitationRow = {
    id: "invite-1",
    organizationId: "org-1",
    invitedByUserId: "admin-1",
    acceptedByUserId: null,
    email: "parent@example.com",
    role: "parent" as const,
    tokenHash: "hash",
    expiresAt: new Date(Date.now() + 3600_000),
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(invitationsRepository.findActiveInvitationByTokenHash).mockReset();
    vi.mocked(invitationsRepository.markInvitationAccepted).mockReset();
    vi.mocked(organizationsRepository.findOrganizationById).mockReset();
    vi.mocked(organizationsRepository.createMembership).mockReset();
    vi.mocked(usersRepository.getUserByEmail).mockReset();
    vi.mocked(usersRepository.createUser).mockReset();
    vi.mocked(authService.hashPassword).mockReset();
    vi.mocked(authService.makeJWT).mockReset();
    vi.mocked(authService.issueRefreshToken).mockReset();
  });

  it("returns invitation details for valid token", async () => {
    vi.mocked(invitationsRepository.findActiveInvitationByTokenHash).mockResolvedValue(
      invitationRow,
    );
    vi.mocked(organizationsRepository.findOrganizationById).mockResolvedValue({
      id: "org-1",
      name: "Center One",
      slug: "center-one",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const out = await invitationsService.getInvitationDetails("a".repeat(64));

    expect(out.email).toBe("parent@example.com");
    expect(out.organizationSlug).toBe("center-one");
    expect(out.role).toBe("parent");
  });

  it("accepts invitation and returns login-style session payload", async () => {
    vi.mocked(invitationsRepository.findActiveInvitationByTokenHash).mockResolvedValue(
      invitationRow,
    );
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue(undefined as never);
    vi.mocked(authService.hashPassword).mockResolvedValue("hashed");
    vi.mocked(usersRepository.createUser).mockResolvedValue({
      id: "user-1",
      email: "parent@example.com",
      hasedPassword: "hashed",
      isSuperadmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(organizationsRepository.createMembership).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-1",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(invitationsRepository.markInvitationAccepted).mockResolvedValue(
      invitationRow,
    );
    vi.mocked(authService.makeJWT).mockReturnValue("access-token");
    vi.mocked(authService.issueRefreshToken).mockResolvedValue("refresh-token");

    const out = await invitationsService.acceptInvitation("a".repeat(64), {
      password: "GoodPass1!",
    });

    expect(out.email).toBe("parent@example.com");
    expect(out.token).toBe("access-token");
    expect(out.refreshToken).toBe("refresh-token");
    expect(organizationsRepository.createMembership).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      role: "parent",
    });
    expect(invitationsRepository.markInvitationAccepted).toHaveBeenCalledWith(
      "invite-1",
      "user-1",
    );
  });

  it("rejects accept when invited email already has an account", async () => {
    vi.mocked(invitationsRepository.findActiveInvitationByTokenHash).mockResolvedValue(
      invitationRow,
    );
    vi.mocked(usersRepository.getUserByEmail).mockResolvedValue({
      id: "existing-1",
      email: "parent@example.com",
      hasedPassword: "h",
      isSuperadmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      invitationsService.acceptInvitation("a".repeat(64), {
        password: "GoodPass1!",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("returns not found for invalid or expired token", async () => {
    vi.mocked(invitationsRepository.findActiveInvitationByTokenHash).mockResolvedValue(
      undefined as never,
    );

    await expect(
      invitationsService.getInvitationDetails("a".repeat(64)),
    ).rejects.toThrow(NotFoundError);
  });
});
