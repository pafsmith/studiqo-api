import { Request } from "express";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UserForbiddenError,
} from "../../common/errors/errors.js";
import {
  requireAdminUser,
  requireOrganizationContext,
  requireUser,
} from "../../common/middleware/authenticate.middleware.js";
import { usersRepository } from "../users/users.repository.js";
import { organizationsRepository } from "./organizations.repository.js";
import {
  toOrganizationInvitationResponse,
  toOrganizationMembershipResponse,
  toOrganizationResponse,
} from "./organizations.mapper.js";
import type {
  OrganizationInvitation,
  OrganizationMembershipRole,
} from "../../db/schema.js";
import type {
  AddOrganizationMemberRequest,
  CreateOrganizationRequest,
  CreateOrganizationInvitationRequest,
  OrganizationInvitationResponse,
  OrganizationMembershipResponse,
  OrganizationResponse,
} from "./organizations.types.js";
import { invitationsRepository } from "../invitations/invitations.repository.js";
import { invitationsEmailService } from "../invitations/invitations.email.js";
import { config } from "../../config/config.js";
import {
  createInvitationToken,
  hashInvitationToken,
} from "../invitations/invitations.token.js";

function ensureOrganizationAdmin(req: Request, organizationId: string): void {
  const context = requireOrganizationContext(req);
  if (
    context.organizationId !== organizationId ||
    context.organizationRole !== "org_admin"
  ) {
    throw new UserForbiddenError("Organization admin access required");
  }
}

function invitationExpiresAt(): Date {
  return new Date(Date.now() + config.invitations.expiresInHours * 60 * 60 * 1000);
}

async function createAndSendInvitation(input: {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterId: string;
  inviterEmail: string;
  inviteeEmail: string;
  role: OrganizationMembershipRole;
}): Promise<OrganizationInvitation> {
  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiresAt();

  const invitation = await invitationsRepository.createInvitation({
    organizationId: input.organizationId,
    invitedByUserId: input.inviterId,
    email: input.inviteeEmail,
    role: input.role,
    tokenHash,
    expiresAt,
  });

  try {
    await invitationsEmailService.sendParentInvitationEmail({
      invitationId: invitation.id,
      inviteeEmail: invitation.email,
      inviterEmail: input.inviterEmail,
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug,
      token,
      expiresAt,
    });
  } catch {
    await invitationsRepository.revokeInvitation(invitation.id);
    throw new BadRequestError("Failed to send invitation email");
  }

  return invitation;
}

export const organizationsService = {
  createOrganization: async (
    req: Request,
    body: CreateOrganizationRequest,
  ): Promise<OrganizationResponse> => {
    const actor = requireUser(req);
    const existing = await organizationsRepository.findOrganizationBySlug(body.slug);
    if (existing) {
      throw new BadRequestError("Organization slug already exists");
    }
    const organization = await organizationsRepository.createOrganization({
      name: body.name,
      slug: body.slug,
    });
    await organizationsRepository.createMembership({
      organizationId: organization.id,
      userId: actor.id,
      role: "org_admin",
    });
    return toOrganizationResponse(organization);
  },

  listMyOrganizations: async (req: Request): Promise<OrganizationResponse[]> => {
    const actor = requireUser(req);
    if (actor.isSuperadmin) {
      const rows = await organizationsRepository.listOrganizations();
      return rows.map(toOrganizationResponse);
    }
    const rows = await organizationsRepository.listOrganizationsForUser(actor.id);
    return rows.map(toOrganizationResponse);
  },

  addOrganizationMember: async (
    req: Request,
    organizationId: string,
    body: AddOrganizationMemberRequest,
  ): Promise<OrganizationMembershipResponse> => {
    const actor = requireUser(req);
    const context = requireOrganizationContext(req);
    const organization =
      await organizationsRepository.findOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }
    if (!actor.isSuperadmin) {
      if (context.organizationId !== organizationId) {
        throw new UserForbiddenError("Access denied");
      }
      requireAdminUser(req);
    }

    const user = await usersRepository.getUserById(body.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const membership = await organizationsRepository.createMembership({
      organizationId,
      userId: body.userId,
      role: body.role,
    });
    return toOrganizationMembershipResponse({
      ...membership,
      email: user.email,
    });
  },

  listOrganizationMembers: async (
    req: Request,
    organizationId: string,
  ): Promise<OrganizationMembershipResponse[]> => {
    const actor = requireUser(req);
    const context = requireOrganizationContext(req);
    if (!actor.isSuperadmin) {
      if (context.organizationId !== organizationId) {
        throw new UserForbiddenError("Access denied");
      }
      requireAdminUser(req);
    }
    const organization =
      await organizationsRepository.findOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }
    const rows =
      await organizationsRepository.listMembershipsForOrganization(organizationId);
    return rows.map(toOrganizationMembershipResponse);
  },

  createParentInvitation: async (
    req: Request,
    organizationId: string,
    body: CreateOrganizationInvitationRequest,
  ): Promise<OrganizationInvitationResponse> => {
    const actor = requireUser(req);
    ensureOrganizationAdmin(req, organizationId);

    const organization =
      await organizationsRepository.findOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const email = body.email.trim().toLowerCase();
    const activeInvite =
      await invitationsRepository.findLatestActiveInvitationForEmailAndRole(
        organizationId,
        email,
        "parent",
      );
    if (activeInvite) {
      throw new ConflictError(
        "An active parent invitation already exists for this email",
      );
    }

    const invitation = await createAndSendInvitation({
      organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      inviterId: actor.id,
      inviterEmail: actor.email,
      inviteeEmail: email,
      role: "parent",
    });

    return toOrganizationInvitationResponse(invitation);
  },

  listOrganizationInvitations: async (
    req: Request,
    organizationId: string,
  ): Promise<OrganizationInvitationResponse[]> => {
    ensureOrganizationAdmin(req, organizationId);
    const organization =
      await organizationsRepository.findOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const rows =
      await invitationsRepository.listInvitationsForOrganization(organizationId);
    return rows.map(toOrganizationInvitationResponse);
  },

  resendOrganizationInvitation: async (
    req: Request,
    organizationId: string,
    invitationId: string,
  ): Promise<OrganizationInvitationResponse> => {
    const actor = requireUser(req);
    ensureOrganizationAdmin(req, organizationId);

    const organization =
      await organizationsRepository.findOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const invitation = await invitationsRepository.findInvitationById(invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.acceptedAt) {
      throw new ConflictError("Invitation already accepted");
    }
    if (invitation.revokedAt) {
      throw new BadRequestError("Invitation already revoked");
    }

    const nextInvitation = await createAndSendInvitation({
      organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      inviterId: actor.id,
      inviterEmail: actor.email,
      inviteeEmail: invitation.email,
      role: invitation.role,
    });

    await invitationsRepository.revokeInvitation(invitation.id);
    return toOrganizationInvitationResponse(nextInvitation);
  },

  revokeOrganizationInvitation: async (
    req: Request,
    organizationId: string,
    invitationId: string,
  ): Promise<OrganizationInvitationResponse> => {
    ensureOrganizationAdmin(req, organizationId);
    const organization =
      await organizationsRepository.findOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const invitation = await invitationsRepository.findInvitationById(invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.acceptedAt) {
      throw new ConflictError("Cannot revoke an accepted invitation");
    }
    if (invitation.revokedAt) {
      return toOrganizationInvitationResponse(invitation);
    }

    const revoked = await invitationsRepository.revokeInvitation(invitationId);
    if (!revoked) {
      throw new NotFoundError("Invitation not found");
    }
    return toOrganizationInvitationResponse(revoked);
  },
};
