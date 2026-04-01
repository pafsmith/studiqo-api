import argon2 from "argon2";
import { authRepository } from "./auth.repository.js";
import { usersRepository } from "../users/users.repository.js";
import { organizationsRepository } from "../organizations/organizations.repository.js";
import {
  toLoginUserResponse,
  toRefreshTokenResponse,
  toRegisterUserResponse,
} from "./auth.mapper.js";
import {
  LoginUserRequest,
  LoginUserResponse,
  RefreshTokenResponse,
  RefreshTokenSource,
  RegisterUserRequest,
  RegisterUserResponse,
} from "./auth.types.js";
import {
  BadRequestError,
  NotFoundError,
  UserNotAuthenticatedError,
} from "../../common/errors/errors.js";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import crypto from "crypto";
import type { CookieOptions, Request } from "express";
import type { User } from "../../db/schema.js";

type TokenPayload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp"> & {
  org?: string;
};

type ResolvedRefreshToken = {
  token: string;
  source: RefreshTokenSource;
};

export const authService = {
  hashPassword: async (password: string) => {
    return await argon2.hash(password);
  },
  checkPasswordHash: async (password: string, hash: string) => {
    return await argon2.verify(hash, password);
  },

  makeJWT: (
    userId: string,
    expiresIn: number,
    secret: string,
    organizationId?: string,
  ): string => {
    const iat = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      iss: "studiqo",
      sub: userId,
      iat,
      exp: iat + expiresIn,
      org: organizationId,
    };
    return jwt.sign(payload, secret, { algorithm: "HS256" });
  },
  validateJWT: (
    tokenString: string,
    secret: string,
  ): { userId: string; organizationId?: string } => {
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(tokenString, secret) as JwtPayload;
    } catch {
      throw new UserNotAuthenticatedError("Invalid token");
    }
    if (decoded.iss !== "studiqo") {
      throw new UserNotAuthenticatedError("Invalid issuer");
    }
    if (!decoded.sub) {
      throw new UserNotAuthenticatedError("No user ID in token");
    }
    return {
      userId: decoded.sub,
      organizationId: decoded.org,
    };
  },

  getBearerToken: (req: Request): string => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UserNotAuthenticatedError("No authorization header");
    }
    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer") {
      throw new UserNotAuthenticatedError("Invalid authorization type");
    }
    return token;
  },

  getRefreshTokenCookieOptions: (): CookieOptions => {
    return {
      httpOnly: true,
      secure: config.auth.cookieSecure,
      sameSite: config.auth.cookieSameSite,
      path: config.auth.cookiePath,
      domain: config.auth.cookieDomain,
      maxAge: config.jwt.refreshDuration * 1000,
    };
  },

  getRefreshTokenCookieName: (): string => {
    return config.auth.refreshCookieName;
  },

  resolveRefreshToken: (req: Request): ResolvedRefreshToken => {
    const cookieToken = req.cookies?.[config.auth.refreshCookieName];
    if (typeof cookieToken === "string" && cookieToken.length > 0) {
      return { token: cookieToken, source: "cookie" };
    }
    const headerToken = authService.getBearerToken(req);
    return { token: headerToken, source: "header" };
  },

  makeRefreshToken: () => {
    return crypto.randomBytes(32).toString("hex");
  },

  issueRefreshToken: async (userId: string): Promise<string> => {
    const refreshToken = authService.makeRefreshToken();
    const createdRefreshToken = await authRepository.createRefreshToken({
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + config.jwt.refreshDuration * 1000),
    });
    if (!createdRefreshToken) {
      throw new BadRequestError("Failed to create refresh token");
    }
    return refreshToken;
  },

  getDefaultOrganizationId: async (userId: string): Promise<string | undefined> => {
    const memberships = await organizationsRepository.listMembershipsForUser(userId);
    return memberships[0]?.organizationId;
  },

  getRoleForOrganization: async (
    userId: string,
    organizationId?: string,
  ): Promise<"org_admin" | "tutor" | "parent" | undefined> => {
    if (!organizationId) {
      return undefined;
    }
    const membership = await organizationsRepository.findMembership(
      organizationId,
      userId,
    );
    return membership?.role;
  },

  ensureDefaultOrganization: async () => {
    const existing =
      await organizationsRepository.findOrganizationBySlug("default-organization");
    if (existing) {
      return existing;
    }
    return organizationsRepository.createOrganization({
      name: "Default Organization",
      slug: "default-organization",
    });
  },

  registerUser: async (user: RegisterUserRequest): Promise<RegisterUserResponse> => {
    const email = user.email.trim().toLowerCase();

    const existingUser = await usersRepository.getUserByEmail(email);

    if (existingUser) {
      throw new BadRequestError("User with this email already exists");
    }

    const hashedPassword = await authService.hashPassword(user.password);
    const newUser = await usersRepository.createUser({
      email: user.email,
      hasedPassword: hashedPassword,
    });
    if (!newUser) {
      throw new BadRequestError("Failed to create user");
    }
    const organization = await authService.ensureDefaultOrganization();
    await organizationsRepository.createMembership({
      organizationId: organization.id,
      userId: newUser.id,
      role: "org_admin",
    });
    return toRegisterUserResponse(newUser, organization.id, "org_admin");
  },
  loginUser: async (user: LoginUserRequest): Promise<LoginUserResponse> => {
    const email = user.email.trim().toLowerCase();
    const existingUser = await usersRepository.getUserByEmail(email);
    if (!existingUser) {
      throw new BadRequestError("Invalid email or password");
    }
    const isPasswordValid = await authService.checkPasswordHash(
      user.password,
      existingUser.hasedPassword,
    );
    if (!isPasswordValid) {
      throw new BadRequestError("Invalid email or password");
    }
    const organizationId = await authService.getDefaultOrganizationId(existingUser.id);
    const organizationRole = await authService.getRoleForOrganization(
      existingUser.id,
      organizationId,
    );
    const accessToken = authService.makeJWT(
      existingUser.id,
      config.jwt.defaultDuration,
      config.jwt.secret,
      organizationId,
    );
    const refreshToken = await authService.issueRefreshToken(existingUser.id);

    return toLoginUserResponse(
      existingUser,
      accessToken,
      refreshToken,
      organizationId,
      organizationRole,
    );
  },

  getMe: async (
    user: User,
    activeOrganizationId?: string,
  ): Promise<RegisterUserResponse> => {
    const role = await authService.getRoleForOrganization(
      user.id,
      activeOrganizationId,
    );
    return toRegisterUserResponse(user, activeOrganizationId, role);
  },
  refreshToken: async (req: Request): Promise<RefreshTokenResponse> => {
    const refreshToken = authService.resolveRefreshToken(req);
    const result = await authRepository.getUserfromRefreshToken(refreshToken.token);
    if (!result) {
      throw new NotFoundError("Refresh token not found");
    }
    await authRepository.revokeRefreshToken(refreshToken.token);
    const nextRefreshToken = await authService.issueRefreshToken(result.user.id);
    const user = result.user;
    const organizationId = await authService.getDefaultOrganizationId(user.id);
    const accessToken = authService.makeJWT(
      user.id,
      config.jwt.defaultDuration,
      config.jwt.secret,
      organizationId,
    );
    return toRefreshTokenResponse(accessToken, nextRefreshToken);
  },

  switchActiveOrganization: async (
    req: Request,
    organizationId: string,
  ): Promise<RefreshTokenResponse> => {
    const actor = req.user;
    if (!actor) {
      throw new UserNotAuthenticatedError("Not authenticated");
    }
    if (!actor.isSuperadmin) {
      const membership = await organizationsRepository.findMembership(
        organizationId,
        actor.id,
      );
      if (!membership) {
        throw new UserNotAuthenticatedError("Not a member of organization");
      }
    }
    const token = authService.makeJWT(
      actor.id,
      config.jwt.defaultDuration,
      config.jwt.secret,
      organizationId,
    );
    return toRefreshTokenResponse(token);
  },

  logoutUser: async (req: Request): Promise<void> => {
    const refreshToken = authService.resolveRefreshToken(req).token;
    await authRepository.revokeRefreshToken(refreshToken);
  },
};
