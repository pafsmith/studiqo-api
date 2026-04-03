/** Public API base URL (includes `/api/v1`). See `apps/web/.env.example`. */
export function getPublicApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
  return raw.replace(/\/$/, "");
}
