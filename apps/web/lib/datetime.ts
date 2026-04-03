/**
 * API date-times are ISO 8601 in UTC (e.g. `2026-04-01T14:00:00.000Z`). Display uses `timeZone`
 * (default `undefined` = runtime local zone).
 */

export function parseIsoDateTime(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`Invalid ISO date-time: ${iso}`);
  }
  return d;
}

export function formatIsoDateTime(
  iso: string,
  options?: {
    /** IANA zone (e.g. `Europe/London`); omit for the user's local timezone */
    timeZone?: string;
    dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
    timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  },
): string {
  const {
    timeZone,
    dateStyle = "medium",
    timeStyle = "short",
  } = options ?? {};
  const d = parseIsoDateTime(iso);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle,
    timeStyle,
    timeZone,
  }).format(d);
}
