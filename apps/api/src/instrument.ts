import * as Sentry from "@sentry/node";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UserForbiddenError,
  UserNotAuthenticatedError,
} from "./common/errors/errors.js";
import { config } from "./config/config.js";

const nonReportableErrors = [
  BadRequestError,
  UserNotAuthenticatedError,
  UserForbiddenError,
  NotFoundError,
  ConflictError,
];

function isExpectedDomainError(error: unknown): boolean {
  return nonReportableErrors.some((ErrorClass) => error instanceof ErrorClass);
}

if (config.sentry.enabled && config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    tracesSampleRate: config.sentry.tracesSampleRate,
    sendDefaultPii: config.sentry.sendDefaultPii,
    release: config.sentry.release,
    beforeSend(event, hint) {
      if (isExpectedDomainError(hint.originalException)) {
        return null;
      }
      return event;
    },
  });
}
