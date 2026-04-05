"use client";

import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

export const organizationMembersQueryKey = (organizationId: string) =>
  ["organizations", organizationId, "members"] as const;

export function useOrganizationMembersQuery(
  organizationId: string | null,
  enabled: boolean,
) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: organizationId
      ? organizationMembersQueryKey(organizationId)
      : ["organizations", "members", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/organizations/{organizationId}/members", {
        params: { path: { organizationId: organizationId! } },
      });
      return unwrapStudiqoResponse(r);
    },
    enabled:
      Boolean(organizationId) &&
      enabled &&
      authStatus === "authenticated" &&
      Boolean(accessToken),
  });
}
