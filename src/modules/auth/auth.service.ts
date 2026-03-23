import argon2 from "argon2";
import { authRepository } from "./auth.repository.js";
import { toLoginUserResponse, toRegisterUserResponse } from "./auth.mapper.js";
import {
  LoginUserRequest,
  LoginUserResponse,
  RegisterUserRequest,
  RegisterUserResponse,
} from "./auth.types.js";
import {
  BadRequestError,
  UserNotAuthenticatedError,
} from "../../common/errors/errors.js";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";

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
    } catch (e) {
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

  registerUser: async (
    user: RegisterUserRequest,
  ): Promise<RegisterUserResponse> => {
    const email = user.email.trim().toLowerCase();

    const existingUser = await authRepository.getUserByEmail(email);

    if (existingUser) {
      throw new BadRequestError("User with this email already exists");
    }

    const hashedPassword = await authService.hashPassword(user.password);
    const newUser = await authRepository.createUser({
      email: user.email,
      hasedPassword: hashedPassword,
    });
    return toRegisterUserResponse(newUser);
  },
  loginUser: async (user: LoginUserRequest): Promise<LoginUserResponse> => {
    const email = user.email.trim().toLowerCase();
    const existingUser = await authRepository.getUserByEmail(email);
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
    return toLoginUserResponse(existingUser);
  },
};
