"use client";

import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

export const organizationQueryKey = ["organizations"] as const;

export function useOrganizationsQuery() {
  const { apiClient, accessToken, authStatus } = useSession();
  return useQuery({
    queryKey: organizationQueryKey,
    queryFn: async () => {
      const r = await apiClient.GET("/organizations");
      return unwrapStudiqoResponse(r);
    },
    enabled: authStatus === "authenticated" && Boolean(accessToken),
  });
}

export function useCreateOrganizationMutation() {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug: string }) => {
      const r = await apiClient.POST("/organizations", { body });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey });
    },
  });
}

export function useSetActiveOrganizationMutation() {
  const { apiClient, setAccessToken, refetchUser } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const r = await apiClient.POST("/auth/active-organization", {
        body: { organizationId },
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: async (data) => {
      setAccessToken(data.token);
      await refetchUser();
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey });
    },
  });
}
