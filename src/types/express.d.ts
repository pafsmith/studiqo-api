import type { User } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` middleware on protected routes. */
      user?: User;
    }
  }
}

export {};
