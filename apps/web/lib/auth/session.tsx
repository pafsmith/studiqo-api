"use client";

import { createStudiqoClient } from "@studiqo/api-client/client";
import {
  unwrapStudiqoResponse,
  unwrapStudiqoVoid,
} from "@studiqo/api-client/errors";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getPublicApiBaseUrl } from "@/lib/env";

export type SessionContextValue = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearSession: () => void;
  refreshAccessToken: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessTokenState(token);
  }, []);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setAccessTokenState(null);
  }, []);

  const client = useMemo(
    () =>
      createStudiqoClient(getPublicApiBaseUrl(), {
        getAccessToken: () => tokenRef.current,
      }),
    [],
  );

  const refreshAccessToken = useCallback(async () => {
    const result = await client.POST("/auth/refresh");
    const data = unwrapStudiqoResponse(result);
    setAccessToken(data.token);
  }, [client, setAccessToken]);

  const logout = useCallback(async () => {
    const result = await client.POST("/auth/logout");
    unwrapStudiqoVoid(result);
    setAccessToken(null);
  }, [client, setAccessToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      accessToken,
      setAccessToken,
      clearSession,
      refreshAccessToken,
      logout,
    }),
    [
      accessToken,
      setAccessToken,
      clearSession,
      refreshAccessToken,
      logout,
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
