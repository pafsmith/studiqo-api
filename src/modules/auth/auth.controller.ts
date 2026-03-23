import { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service.js";
import { respondWithJSON } from "../../common/utils/json.js";
import { RegisterUserResponse } from "./auth.types.js";

export const authController = {
async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await authService.registerUser(req.body);
        respondWithJSON(res, 201, user);
    } catch (error) {
        next(error);
    }
}
}