import { createStudiqoClient } from "@studiqo/api-client/client";
import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";

import { getPublicApiBaseUrl } from "@/lib/env";

/** Typed smoke path: `GET /health` (OpenAPI `getHealth`). */
export async function fetchHealth() {
  const client = createStudiqoClient(getPublicApiBaseUrl());
  const result = await client.GET("/health");
  return unwrapStudiqoResponse(result);
}
