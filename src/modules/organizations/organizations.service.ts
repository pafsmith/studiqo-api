import { Request } from "express";
import {
  BadRequestError,
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
  toOrganizationMembershipResponse,
  toOrganizationResponse,
} from "./organizations.mapper.js";
import type {
  AddOrganizationMemberRequest,
  CreateOrganizationRequest,
  OrganizationMembershipResponse,
  OrganizationResponse,
} from "./organizations.types.js";

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
    return toOrganizationMembershipResponse(membership);
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
};
