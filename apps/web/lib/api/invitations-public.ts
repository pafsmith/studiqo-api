import { createStudiqoClient } from "@studiqo/api-client/client";
import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";

import { getPublicApiBaseUrl } from "@/lib/env";

function publicClient() {
  return createStudiqoClient(getPublicApiBaseUrl());
}

export async function fetchInvitationDetails(token: string) {
  const client = publicClient();
  const r = await client.GET("/invites/{token}", {
    params: { path: { token } },
  });
  return unwrapStudiqoResponse(r);
}

export async function acceptInvitationRequest(token: string, password: string) {
  const client = publicClient();
  const r = await client.POST("/invites/{token}/accept", {
    params: { path: { token } },
    body: { password },
  });
  return unwrapStudiqoResponse(r);
}
