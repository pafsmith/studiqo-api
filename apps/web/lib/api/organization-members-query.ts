"use client";

import type { components } from "@studiqo/api-client/generated";
import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

import { organizationQueryKey } from "./organizations-query";

type AddMemberBody = components["schemas"]["AddOrganizationMemberRequest"];

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

export function useAddOrganizationMemberMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AddMemberBody) => {
      const r = await apiClient.POST("/organizations/{organizationId}/members", {
        params: { path: { organizationId } },
        body,
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationMembersQueryKey(organizationId),
      });
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey });
    },
  });
}
