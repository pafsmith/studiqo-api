"use client";

import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

export const subjectsListQueryKey = (organizationId: string) =>
  ["subjects", organizationId, "list"] as const;

function enabledWorkspace(
  organizationId: string | null,
  authStatus: string,
  accessToken: string | null,
): boolean {
  return (
    Boolean(organizationId) &&
    authStatus === "authenticated" &&
    Boolean(accessToken)
  );
}

export function useSubjectsListQuery(organizationId: string | null) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: organizationId
      ? subjectsListQueryKey(organizationId)
      : ["subjects", "list", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/subjects");
      return unwrapStudiqoResponse(r);
    },
    enabled: enabledWorkspace(organizationId, authStatus, accessToken),
  });
}

export function useCreateSubjectMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const r = await apiClient.POST("/subjects", { body });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: subjectsListQueryKey(organizationId),
      });
    },
  });
}
