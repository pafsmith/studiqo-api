"use client";

import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

import { organizationQueryKey } from "./organizations-query";

export function organizationInvitationsQueryKey(organizationId: string) {
  return ["organizations", organizationId, "invites"] as const;
}

export function useOrganizationInvitationsQuery(organizationId: string | null) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: organizationId
      ? organizationInvitationsQueryKey(organizationId)
      : ["organization-invites", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/organizations/{organizationId}/invites", {
        params: { path: { organizationId: organizationId! } },
      });
      return unwrapStudiqoResponse(r);
    },
    enabled:
      Boolean(organizationId) &&
      authStatus === "authenticated" &&
      Boolean(accessToken),
  });
}

export function useCreateOrganizationInvitationMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string }) => {
      const r = await apiClient.POST("/organizations/{organizationId}/invites", {
        params: { path: { organizationId } },
        body,
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationInvitationsQueryKey(organizationId),
      });
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey });
    },
  });
}

export function useResendOrganizationInvitationMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const r = await apiClient.POST(
        "/organizations/{organizationId}/invites/{invitationId}/resend",
        {
          params: { path: { organizationId, invitationId } },
        },
      );
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationInvitationsQueryKey(organizationId),
      });
    },
  });
}

export function useRevokeOrganizationInvitationMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const r = await apiClient.POST(
        "/organizations/{organizationId}/invites/{invitationId}/revoke",
        {
          params: { path: { organizationId, invitationId } },
        },
      );
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationInvitationsQueryKey(organizationId),
      });
    },
  });
}
