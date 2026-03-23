import { ZodObject, ZodError } from "zod";
import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../errors/errors.js";

export function validate(schema: ZodObject<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new BadRequestError("Validation failed: " + error.issues[0]?.message),
        );
      }

      next(error);
    }
  };
}
