import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../common/errors/errors.js";
import { organizationsRepository } from "../organizations/organizations.repository.js";
import { invitationsRepository } from "./invitations.repository.js";
import { hashInvitationToken } from "./invitations.token.js";
import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  InvitationDetailsResponse,
} from "./invitations.types.js";
import { usersRepository } from "../users/users.repository.js";
import { authService } from "../auth/auth.service.js";
import { config } from "../../config/config.js";
import {
  toAcceptInvitationResponse,
  toInvitationDetailsResponse,
} from "./invitations.mapper.js";

async function resolveActiveInvitation(token: string) {
  const normalizedToken = token.trim().toLowerCase();
  const tokenHash = hashInvitationToken(normalizedToken);
  const invitation =
    await invitationsRepository.findActiveInvitationByTokenHash(tokenHash);

  if (!invitation) {
    throw new NotFoundError("Invitation not found or expired");
  }

  return invitation;
}

export const invitationsService = {
  getInvitationDetails: async (token: string): Promise<InvitationDetailsResponse> => {
    const invitation = await resolveActiveInvitation(token);
    const organization = await organizationsRepository.findOrganizationById(
      invitation.organizationId,
    );

    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    return toInvitationDetailsResponse(invitation, organization);
  },

  acceptInvitation: async (
    token: string,
    body: AcceptInvitationRequest,
  ): Promise<AcceptInvitationResponse> => {
    const invitation = await resolveActiveInvitation(token);

    const existingUser = await usersRepository.getUserByEmail(invitation.email);
    if (existingUser) {
      throw new ConflictError(
        "An account with this invitation email already exists. Sign in to continue.",
      );
    }

    const hashedPassword = await authService.hashPassword(body.password);
    const createdUser = await usersRepository.createUser({
      email: invitation.email,
      hasedPassword: hashedPassword,
    });
    if (!createdUser) {
      throw new BadRequestError("Failed to create user");
    }

    await organizationsRepository.createMembership({
      organizationId: invitation.organizationId,
      userId: createdUser.id,
      role: invitation.role,
    });
    await invitationsRepository.markInvitationAccepted(invitation.id, createdUser.id);

    const accessToken = authService.makeJWT(
      createdUser.id,
      config.jwt.defaultDuration,
      config.jwt.secret,
      invitation.organizationId,
    );
    const refreshToken = await authService.issueRefreshToken(createdUser.id);

    return toAcceptInvitationResponse(
      createdUser,
      accessToken,
      refreshToken,
      invitation.organizationId,
      invitation.role,
    );
  },
};
