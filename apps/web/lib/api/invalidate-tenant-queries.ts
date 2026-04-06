import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidates cached data that depends on the active organization JWT.
 * Call after switching active org so lists cannot show the previous tenant.
 */
export function invalidateTenantScopedQueries(
  queryClient: QueryClient,
): void {
  void queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey;
      if (!Array.isArray(k) || k.length === 0) return false;
      const root = k[0];
      if (root === "students" || root === "lessons" || root === "subjects") {
        return true;
      }
      if (root === "organizations" && k.length > 1) {
        return true;
      }
      return false;
    },
  });
}
