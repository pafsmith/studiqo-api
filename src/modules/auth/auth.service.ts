import argon2 from "argon2";
import { authRepository } from "./auth.repository.js";
import { usersRepository } from "../users/users.repository.js";
import {
  toLoginUserResponse,
  toRefreshTokenResponse,
  toRegisterUserResponse,
} from "./auth.mapper.js";
import {
  LoginUserRequest,
  LoginUserResponse,
  RefreshTokenResponse,
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
import { Request } from "express";
import type { User } from "../../db/schema.js";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export const authService = {
  hashPassword: async (password: string) => {
    return await argon2.hash(password);
  },
  checkPasswordHash: async (password: string, hash: string) => {
    return await argon2.verify(hash, password);
  },

  makeJWT: (userId: string, expiresIn: number, secret: string): string => {
    const iat = Math.floor(Date.now() / 1000);
    const payload: payload = {
      iss: "studiqo",
      sub: userId,
      iat,
      exp: iat + expiresIn,
    };
    return jwt.sign(payload, secret, { algorithm: "HS256" });
  },
  validateJWT: (tokenString: string, secret: string): string => {
    let decoded: payload;
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
    return decoded.sub;
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

  makeRefreshToken: () => {
    return crypto.randomBytes(32).toString("hex");
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
    return toRegisterUserResponse(newUser);
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
    const accessToken = authService.makeJWT(
      existingUser.id,
      config.jwt.defaultDuration,
      config.jwt.secret,
    );

    const refreshToken = authService.makeRefreshToken();
    const newRefreshToken = await authRepository.createRefreshToken({
      userId: existingUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + config.jwt.defaultDuration * 1000),
    });
    if (!newRefreshToken) {
      throw new BadRequestError("Failed to create refresh token");
    }

    return toLoginUserResponse(existingUser, accessToken, refreshToken);
  },

  getMe: (user: User): RegisterUserResponse => {
    return toRegisterUserResponse(user);
  },
  refreshToken: async (req: Request): Promise<RefreshTokenResponse> => {
    const token = authService.getBearerToken(req);
    const result = await authRepository.getUserfromRefreshToken(token);
    if (!result) {
      throw new NotFoundError("Refresh token not found");
    }
    const user = result.user;
    const accessToken = authService.makeJWT(
      user.id,
      config.jwt.defaultDuration,
      config.jwt.secret,
    );
    return toRefreshTokenResponse(accessToken);
  },

  logoutUser: async (req: Request): Promise<void> => {
    const refreshToken = authService.getBearerToken(req);
    await authRepository.revokeRefreshToken(refreshToken);
  },
};
