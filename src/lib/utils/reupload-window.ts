/**
 * Utilities for enforcing the reupload window:
 * Users can reupload a rejected submission until the end of the next day (11:59:59.999 pm)
 * in their local time zone.
 */

/**
 * Compute the UTC cutoff timestamp (ms) for a rejection time and client offset.
 * @param rejectionTimestamp ISO string or Date representing when the submission was rejected
 * @param tzOffsetMinutes client timezone offset in minutes (from Date.getTimezoneOffset)
 */
export function getReuploadCutoffUtc(
  rejectionTimestamp: string | Date,
  tzOffsetMinutes: number
): number | null {
  const rejection = new Date(rejectionTimestamp);
  if (Number.isNaN(rejection.getTime())) return null;

  const offset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;

  // Convert rejection to local wall-clock by subtracting the offset (local = utc - offset)
  const rejectionLocalMs = rejection.getTime() - offset * 60_000;
  const rejectionLocal = new Date(rejectionLocalMs);

  // Next-day 11:59:59.999 local
  const cutoffUtc =
    Date.UTC(
      rejectionLocal.getUTCFullYear(),
      rejectionLocal.getUTCMonth(),
      rejectionLocal.getUTCDate() + 1,
      23,
      59,
      59,
      999
    ) + offset * 60_000; // convert local wall time back to UTC

  return cutoffUtc;
}

/**
 * Determine whether the reupload window is still open.
 * @param rejectionTimestamp ISO string or Date for the rejection moment
 * @param tzOffsetMinutes client timezone offset
 * @param nowMs current timestamp (ms) - useful for tests
 */
export function isReuploadWindowOpen(
  rejectionTimestamp: string | Date | null | undefined,
  tzOffsetMinutes: number,
  nowMs: number = Date.now()
): boolean {
  if (!rejectionTimestamp) return false;
  const cutoffUtc = getReuploadCutoffUtc(rejectionTimestamp, tzOffsetMinutes);
  if (cutoffUtc === null) return false;
  return nowMs <= cutoffUtc;
}
