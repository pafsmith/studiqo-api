"use client";

import type { components } from "@studiqo/api-client/generated";
import { unwrapStudiqoResponse } from "@studiqo/api-client/errors";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

export type LessonsListFilters = {
  from: string;
  to: string;
  studentId?: string;
  tutorId?: string;
};

export const lessonsListQueryKey = (
  organizationId: string,
  filters: LessonsListFilters,
) =>
  [
    "lessons",
    organizationId,
    "list",
    filters.from,
    filters.to,
    filters.studentId ?? "",
    filters.tutorId ?? "",
  ] as const;

export const lessonDetailQueryKey = (lessonId: string) =>
  ["lessons", lessonId, "detail"] as const;

type CreateLessonBody = components["schemas"]["CreateLessonRequest"];
type UpdateLessonBody = components["schemas"]["UpdateLessonRequest"];

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

export function invalidateLessonQueriesForOrg(
  queryClient: QueryClient,
  organizationId: string,
): void {
  void queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "lessons" &&
      q.queryKey[1] === organizationId,
  });
}

export function useLessonsListQuery(
  organizationId: string | null,
  filters: LessonsListFilters | null,
  rangeValid: boolean,
) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey:
      organizationId && filters && rangeValid
        ? lessonsListQueryKey(organizationId, filters)
        : ["lessons", "list", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/lessons", {
        params: {
          query: {
            from: filters!.from,
            to: filters!.to,
            ...(filters!.studentId ? { studentId: filters!.studentId } : {}),
            ...(filters!.tutorId ? { tutorId: filters!.tutorId } : {}),
          },
        },
      });
      return unwrapStudiqoResponse(r);
    },
    enabled:
      enabledWorkspace(organizationId, authStatus, accessToken) &&
      Boolean(filters) &&
      rangeValid,
  });
}

export function useLessonDetailQuery(
  organizationId: string | null,
  lessonId: string | null,
) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: lessonId
      ? lessonDetailQueryKey(lessonId)
      : ["lessons", "detail", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/lessons/{lessonId}", {
        params: { path: { lessonId: lessonId! } },
      });
      return unwrapStudiqoResponse(r);
    },
    enabled:
      enabledWorkspace(organizationId, authStatus, accessToken) &&
      Boolean(lessonId),
  });
}

export function useCreateLessonMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateLessonBody) => {
      const r = await apiClient.POST("/lessons", { body });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      invalidateLessonQueriesForOrg(queryClient, organizationId);
    },
  });
}

export function useUpdateLessonMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lessonId,
      body,
    }: {
      lessonId: string;
      body: UpdateLessonBody;
    }) => {
      const r = await apiClient.PUT("/lessons/{lessonId}", {
        params: { path: { lessonId } },
        body,
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, { lessonId }) => {
      invalidateLessonQueriesForOrg(queryClient, organizationId);
      void queryClient.invalidateQueries({
        queryKey: lessonDetailQueryKey(lessonId),
      });
    },
  });
}

export function useCompleteLessonMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const r = await apiClient.POST("/lessons/{lessonId}/complete", {
        params: { path: { lessonId } },
        body: {},
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, lessonId) => {
      invalidateLessonQueriesForOrg(queryClient, organizationId);
      void queryClient.invalidateQueries({
        queryKey: lessonDetailQueryKey(lessonId),
      });
    },
  });
}

export function useCancelLessonMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const r = await apiClient.POST("/lessons/{lessonId}/cancel", {
        params: { path: { lessonId } },
        body: {},
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, lessonId) => {
      invalidateLessonQueriesForOrg(queryClient, organizationId);
      void queryClient.invalidateQueries({
        queryKey: lessonDetailQueryKey(lessonId),
      });
    },
  });
}
