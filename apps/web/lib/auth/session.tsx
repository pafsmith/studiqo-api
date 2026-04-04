"use client";

import { createStudiqoClient } from "@studiqo/api-client/client";
import {
  unwrapStudiqoResponse,
  unwrapStudiqoVoid,
} from "@studiqo/api-client/errors";
import type { components } from "@studiqo/api-client/generated";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getPublicApiBaseUrl } from "@/lib/env";

export type UserPublic = components["schemas"]["UserPublic"];

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type SessionContextValue = {
  apiClient: ReturnType<typeof createStudiqoClient>;
  accessToken: string | null;
  user: UserPublic | null;
  authStatus: AuthStatus;
  setAccessToken: (token: string | null) => void;
  clearSession: () => void;
  refreshAccessToken: () => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerAccount: (email: string, password: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const tokenRef = useRef<string | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessTokenState(token);
  }, []);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setAccessTokenState(null);
    setUser(null);
    setAuthStatus("unauthenticated");
  }, []);

  const client = useMemo(
    () =>
      createStudiqoClient(getPublicApiBaseUrl(), {
        getAccessToken: () => tokenRef.current,
      }),
    [],
  );

  const fetchMe = useCallback(async () => {
    const meResult = await client.GET("/auth/me");
    const u = unwrapStudiqoResponse(meResult);
    setUser(u);
    setAuthStatus("authenticated");
  }, [client]);

  const refetchUser = useCallback(async () => {
    if (!tokenRef.current) return;
    await fetchMe();
  }, [fetchMe]);

  const refreshAccessToken = useCallback(async () => {
    const result = await client.POST("/auth/refresh");
    const data = unwrapStudiqoResponse(result);
    setAccessToken(data.token);
  }, [client, setAccessToken]);

  const logout = useCallback(async () => {
    const result = await client.POST("/auth/logout");
    unwrapStudiqoVoid(result);
    clearSession();
  }, [client, clearSession]);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const result = await client.POST("/auth/login", {
        body: { email, password },
      });
      const data = unwrapStudiqoResponse(result);
      setAccessToken(data.token);
      await fetchMe();
    },
    [client, setAccessToken, fetchMe],
  );

  const registerAccount = useCallback(
    async (email: string, password: string) => {
      await client.POST("/auth/register", {
        body: { email, password },
      });
    },
    [client],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAuthStatus("loading");
      const refreshResult = await client.POST("/auth/refresh");
      if (cancelled) return;
      if (!refreshResult.response.ok) {
        tokenRef.current = null;
        setAccessTokenState(null);
        setUser(null);
        setAuthStatus("unauthenticated");
        return;
      }
      try {
        const data = unwrapStudiqoResponse(refreshResult);
        setAccessToken(data.token);
        const meResult = await client.GET("/auth/me");
        if (cancelled) return;
        const u = unwrapStudiqoResponse(meResult);
        setUser(u);
        setAuthStatus("authenticated");
      } catch {
        if (cancelled) return;
        clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, setAccessToken, clearSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      apiClient: client,
      accessToken,
      user,
      authStatus,
      setAccessToken,
      clearSession,
      refreshAccessToken,
      logout,
      refetchUser,
      loginWithPassword,
      registerAccount,
    }),
    [
      client,
      accessToken,
      user,
      authStatus,
      setAccessToken,
      clearSession,
      refreshAccessToken,
      logout,
      refetchUser,
      loginWithPassword,
      registerAccount,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
