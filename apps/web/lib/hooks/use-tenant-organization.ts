"use client";

import { useMemo } from "react";

import { useOrganizationsQuery } from "@/lib/api/organizations-query";

export function useTenantOrganizationId(tenantSlug: string) {
  const { data: orgs, isLoading } = useOrganizationsQuery();
  const organizationId = useMemo(
    () => orgs?.find((o) => o.slug === tenantSlug)?.id ?? null,
    [orgs, tenantSlug],
  );
  return { organizationId, orgsLoading: isLoading };
}
