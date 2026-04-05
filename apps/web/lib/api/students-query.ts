"use client";

import type { components } from "@studiqo/api-client/generated";
import {
  unwrapStudiqoResponse,
  unwrapStudiqoVoid,
} from "@studiqo/api-client/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/session";

export const studentsListQueryKey = (organizationId: string) =>
  ["students", organizationId, "list"] as const;

export const studentDetailQueryKey = (studentId: string) =>
  ["students", studentId, "detail"] as const;

export const studentSubjectsQueryKey = (studentId: string) =>
  ["students", studentId, "subjects"] as const;

export const studentEmergencyContactsQueryKey = (studentId: string) =>
  ["students", studentId, "emergency-contacts"] as const;

type CreateStudentBody = components["schemas"]["CreateStudentRequest"];
type UpdateStudentBody = components["schemas"]["UpdateStudentRequest"];
type LinkStudentSubjectBody = components["schemas"]["LinkStudentSubjectRequest"];
type CreateEmergencyContactBody =
  components["schemas"]["CreateEmergencyContactRequest"];
type UpdateEmergencyContactBody =
  components["schemas"]["UpdateEmergencyContactRequest"];

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

export function useStudentsListQuery(organizationId: string | null) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: organizationId
      ? studentsListQueryKey(organizationId)
      : ["students", "list", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/students");
      return unwrapStudiqoResponse(r);
    },
    enabled: enabledWorkspace(organizationId, authStatus, accessToken),
  });
}

export function useStudentDetailQuery(
  organizationId: string | null,
  studentId: string | null,
) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: studentId
      ? studentDetailQueryKey(studentId)
      : ["students", "detail", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/students/{studentId}", {
        params: { path: { studentId: studentId! } },
      });
      return unwrapStudiqoResponse(r);
    },
    enabled:
      enabledWorkspace(organizationId, authStatus, accessToken) &&
      Boolean(studentId),
  });
}

export function useStudentSubjectsQuery(
  organizationId: string | null,
  studentId: string | null,
) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: studentId
      ? studentSubjectsQueryKey(studentId)
      : ["students", "subjects", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET("/students/{studentId}/subjects", {
        params: { path: { studentId: studentId! } },
      });
      return unwrapStudiqoResponse(r);
    },
    enabled:
      enabledWorkspace(organizationId, authStatus, accessToken) &&
      Boolean(studentId),
  });
}

export function useStudentEmergencyContactsQuery(
  organizationId: string | null,
  studentId: string | null,
) {
  const { apiClient, authStatus, accessToken } = useSession();
  return useQuery({
    queryKey: studentId
      ? studentEmergencyContactsQueryKey(studentId)
      : ["students", "emergency-contacts", "disabled"],
    queryFn: async () => {
      const r = await apiClient.GET(
        "/students/{studentId}/emergency-contacts",
        {
          params: { path: { studentId: studentId! } },
        },
      );
      return unwrapStudiqoResponse(r);
    },
    enabled:
      enabledWorkspace(organizationId, authStatus, accessToken) &&
      Boolean(studentId),
  });
}

export function useCreateStudentMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateStudentBody) => {
      const r = await apiClient.POST("/students", { body });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studentsListQueryKey(organizationId),
      });
    },
  });
}

export function useUpdateStudentMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      body,
    }: {
      studentId: string;
      body: UpdateStudentBody;
    }) => {
      const r = await apiClient.PUT("/students/{studentId}", {
        params: { path: { studentId } },
        body,
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, { studentId }) => {
      void queryClient.invalidateQueries({
        queryKey: studentsListQueryKey(organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: studentDetailQueryKey(studentId),
      });
    },
  });
}

export function useDeleteStudentMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const r = await apiClient.DELETE("/students/{studentId}", {
        params: { path: { studentId } },
      });
      unwrapStudiqoVoid(r);
    },
    onSuccess: (_void, studentId) => {
      void queryClient.invalidateQueries({
        queryKey: studentsListQueryKey(organizationId),
      });
      void queryClient.removeQueries({
        queryKey: studentDetailQueryKey(studentId),
      });
    },
  });
}

export function useLinkStudentSubjectMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      body,
    }: {
      studentId: string;
      body: LinkStudentSubjectBody;
    }) => {
      const r = await apiClient.POST("/students/{studentId}/subjects", {
        params: { path: { studentId } },
        body,
      });
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, { studentId }) => {
      void queryClient.invalidateQueries({
        queryKey: studentSubjectsQueryKey(studentId),
      });
      void queryClient.invalidateQueries({
        queryKey: studentsListQueryKey(organizationId),
      });
    },
  });
}

export function useCreateEmergencyContactMutation() {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      body,
    }: {
      studentId: string;
      body: CreateEmergencyContactBody;
    }) => {
      const r = await apiClient.POST(
        "/students/{studentId}/emergency-contacts",
        {
          params: { path: { studentId } },
          body,
        },
      );
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, { studentId }) => {
      void queryClient.invalidateQueries({
        queryKey: studentEmergencyContactsQueryKey(studentId),
      });
    },
  });
}

export function useUpdateEmergencyContactMutation(organizationId: string) {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      contactId,
      body,
    }: {
      studentId: string;
      contactId: string;
      body: UpdateEmergencyContactBody;
    }) => {
      const r = await apiClient.PUT(
        "/students/{studentId}/emergency-contacts/{contactId}",
        {
          params: { path: { studentId, contactId } },
          body,
        },
      );
      return unwrapStudiqoResponse(r);
    },
    onSuccess: (_data, { studentId }) => {
      void queryClient.invalidateQueries({
        queryKey: studentEmergencyContactsQueryKey(studentId),
      });
      void queryClient.invalidateQueries({
        queryKey: studentsListQueryKey(organizationId),
      });
    },
  });
}

export function useDeleteEmergencyContactMutation() {
  const { apiClient } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      contactId,
    }: {
      studentId: string;
      contactId: string;
    }) => {
      const r = await apiClient.DELETE(
        "/students/{studentId}/emergency-contacts/{contactId}",
        {
          params: { path: { studentId, contactId } },
        },
      );
      unwrapStudiqoVoid(r);
    },
    onSuccess: (_void, { studentId }) => {
      void queryClient.invalidateQueries({
        queryKey: studentEmergencyContactsQueryKey(studentId),
      });
    },
  });
}
