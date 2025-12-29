export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatYMDWithIntl(now: Date, timeZone: string): string {
  try {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return f.format(now); // en-CA uses YYYY-MM-DD
  } catch (err) {
    // Invalid timezone or Intl not available — fall through
    throw err;
  }
}

export interface GetUserLocalDateOptions {
  now?: Date;
  ianaTimezone?: string | null;
  tzOffsetMinutes?: number | null; // same as new Date().getTimezoneOffset()
  legacyTimezoneOffset?: number | null; // old +offset sign
}

/**
 * Compute the user's local YYYY-MM-DD date using the best available timezone info.
 * Preference order:
 *  1. `ianaTimezone` (e.g., 'America/Los_Angeles') using date-fns-tz
 *  2. `tzOffsetMinutes` (same as new Date().getTimezoneOffset())
 *  3. `legacyTimezoneOffset` (existing old param, inverted sign)
 *  4. Fallback to server local time
 */
export function getUserLocalDateYMD(opts: GetUserLocalDateOptions): string {
  const now = opts.now ?? new Date();
  const { ianaTimezone, tzOffsetMinutes, legacyTimezoneOffset } = opts;

  // 1) Try IANA timezone (most robust around DST) using built-in Intl API
  if (ianaTimezone) {
    try {
      return formatYMDWithIntl(now, ianaTimezone);
    } catch (err) {
      // Invalid timezone string or Intl issue — fallback to next option
    }
  }

  // 2) Try tzOffsetMinutes (same as getTimezoneOffset())
  let tzMinutes: number | null = null;
  if (typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)) {
    tzMinutes = tzOffsetMinutes;
  } else if (typeof legacyTimezoneOffset === 'number' && Number.isFinite(legacyTimezoneOffset)) {
    // Convert legacy +offset to getTimezoneOffset() semantics by negating
    tzMinutes = -legacyTimezoneOffset;
  }

  if (typeof tzMinutes === 'number') {
    const utcTime = now.getTime();
    const userTime = new Date(utcTime - tzMinutes * 60_000);
    return formatYMD(userTime);
  }

  // 4) fallback: server local
  return formatYMD(now);
}

/**
 * Return a Date that's adjusted to the user's timezone for "local" operations.
 * - If an IANA timezone is provided, use date-fns-tz
 * - Otherwise, fall back to offset-based adjustments
 */
export function getNowInZone(opts: GetUserLocalDateOptions): Date {
  const now = opts.now ?? new Date();
  const { ianaTimezone, tzOffsetMinutes, legacyTimezoneOffset } = opts;

  // Prefer IANA: we can compute the user's YMD via Intl, then build a Date at local midnight
  if (ianaTimezone) {
    try {
      const ymd = formatYMDWithIntl(now, ianaTimezone);
      const [y, m, d] = ymd.split('-').map((p) => Number(p));
      return new Date(y, m - 1, d);
    } catch (err) {
      // invalid timezone; continue to fallback
    }
  }

  let tzMinutes: number | null = null;
  if (typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)) tzMinutes = tzOffsetMinutes;
  else if (typeof legacyTimezoneOffset === 'number' && Number.isFinite(legacyTimezoneOffset)) tzMinutes = -legacyTimezoneOffset;

  if (typeof tzMinutes === 'number') {
    const utcTime = now.getTime();
    const userTime = new Date(utcTime - tzMinutes * 60_000);
    // Return a Date representing user's local midnight by extracting YMD components
    return new Date(userTime.getFullYear(), userTime.getMonth(), userTime.getDate());
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
