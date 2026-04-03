import createClient from "openapi-fetch";

import type { paths } from "./generated";

export type StudiqoClientOptions = {
  getAccessToken?: () => string | null;
};

export type StudiqoClient = ReturnType<typeof createStudiqoClient>;

/**
 * Typed OpenAPI client: `credentials: "include"` for refresh cookies; optional Bearer from `getAccessToken`.
 */
export function createStudiqoClient(
  baseUrl: string,
  options: StudiqoClientOptions = {},
) {
  const getAccessToken = options.getAccessToken ?? (() => null);

  const client = createClient<paths>({
    baseUrl,
    credentials: "include",
  });

  client.use({
    onRequest({ request }) {
      const token = getAccessToken();
      if (!token) {
        return;
      }
      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return new Request(request, { headers });
    },
  });

  return client;
}
