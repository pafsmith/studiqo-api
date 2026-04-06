"use client";

import type { components } from "@studiqo/api-client/generated";
import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

import { organizationMembersQueryKey } from "./organization-members-query";

type UpdateUserBody = components["schemas"]["UpdateUserRequest"];

export function useUpdateUserMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { userId: string; body: UpdateUserBody }) => {
      const r = await apiClient.PUT("/users/{userId}", {
        params: { path: { userId: args.userId } },
        body: args.body,
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationMembersQueryKey(organizationId),
      });
    },
  });
}
