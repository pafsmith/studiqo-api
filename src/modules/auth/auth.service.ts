import argon2 from "argon2";
import { authRepository } from "./auth.repository.js";
import { toRegisterUserResponse } from "./auth.mapper.js";
import { RegisterUserRequest, RegisterUserResponse } from "./auth.types.js";
import { BadRequestError } from "../../common/errors/errors.js";


export const authService = {
    hashPassword: async (password: string) => {
        return await argon2.hash(password);
    },
    checkPasswordHash: async (password: string, hash: string) => {
        return await argon2.verify(hash, password);
    },

    registerUser: async (user: RegisterUserRequest): Promise<RegisterUserResponse> => {
        
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
}