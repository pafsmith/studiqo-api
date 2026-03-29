import { type ZodType, ZodError } from "zod";
import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../errors/errors.js";

export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      if (data && typeof data === "object") {
        if ("body" in data && data.body !== undefined) {
          req.body = data.body;
        }
        if ("params" in data && data.params !== undefined) {
          Object.assign(req.params, data.params);
        }
        if ("query" in data && data.query !== undefined) {
          Object.assign(req.query as object, data.query as object);
        }
      }

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
