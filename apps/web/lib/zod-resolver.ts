import { zodResolver as zodResolverImpl } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type * as z4 from "zod/v4/core";

export function zodResolver<T extends FieldValues>(
  schema: z4.$ZodType<T, T>,
): Resolver<T> {
  return zodResolverImpl(schema as never) as Resolver<T>;
}
