import { cn } from "@/lib/utils";

/** Styling aligned with shadcn `Input` for native `<select>` with React Hook Form. */
export function nativeSelectClassName(className?: string) {
  return cn(
    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
    className,
  );
}
