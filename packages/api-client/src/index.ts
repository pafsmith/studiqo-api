/**
 * Prefer `@studiqo/api-client/client` and `@studiqo/api-client/errors` for smaller bundles.
 */
export {
  createStudiqoClient,
  type StudiqoClient,
  type StudiqoClientOptions,
} from "./create-client";
export {
  StudiqoApiError,
  isStudiqoApiError,
  throwIfStudiqoError,
  unwrapStudiqoResponse,
  unwrapStudiqoVoid,
} from "./errors";
