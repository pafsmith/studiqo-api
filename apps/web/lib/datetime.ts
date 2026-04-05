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

export function formatIsoDate(iso: string): string {
  const d = parseIsoDateTime(iso);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
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

/** Monday 00:00:00.000 in the user's local timezone. */
export function startOfIsoWeekLocal(ref = new Date()): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Sunday 23:59:59.999 local, for the week that contains `ref`. */
export function endOfIsoWeekLocal(ref = new Date()): Date {
  const start = startOfIsoWeekLocal(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Value for `<input type="datetime-local" />` in local time. */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse `datetime-local` string (no timezone) as local instant → ISO UTC for the API. */
export function parseDatetimeLocalToIso(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`Invalid datetime-local: ${local}`);
  }
  return d.toISOString();
}
