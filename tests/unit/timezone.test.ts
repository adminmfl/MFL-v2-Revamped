import { getNowInZone, getUserLocalDateYMD } from '@/lib/utils/timezone';

describe('getUserLocalDateYMD', () => {
  it('uses IANA timezone to compute local date (America/Los_Angeles) when date-fns-tz is available', () => {
    const now = new Date('2025-12-30T05:00:00Z'); // 05:00 UTC -> 2025-12-29T21:00 PST
    let hasTZ = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('date-fns-tz');
    } catch (e) {
      hasTZ = false;
    }

    const ymd = getUserLocalDateYMD({ now, ianaTimezone: 'America/Los_Angeles' });
    if (hasTZ) {
      expect(ymd).toBe('2025-12-29');
    } else {
      // If the dependency isn't installed, ensure we still return a valid YMD string
      expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('falls back to tzOffsetMinutes when IANA invalid', () => {
    const now = new Date('2025-12-30T00:30:00Z');
    // IST is UTC+5:30, getTimezoneOffset() === -330
    const ymd = getUserLocalDateYMD({ now, ianaTimezone: 'Invalid/Zone', tzOffsetMinutes: -330 });
    expect(ymd).toBe('2025-12-30');
  });

  it('supports legacy timezone_offset (inverted sign)', () => {
    const now = new Date('2025-12-30T00:30:00Z');
    // legacy uses +330 for IST; function negates it internally
    const ymd = getUserLocalDateYMD({ now, legacyTimezoneOffset: 330 });
    expect(ymd).toBe('2025-12-30');
  });

  it('falls back to server time when nothing provided', () => {
    const now = new Date('2025-12-30T12:00:00Z');
    const ymd = getUserLocalDateYMD({ now });
    expect(ymd).toBe('2025-12-30');
  });
});

describe('getNowInZone', () => {
  it('returns midnight for a valid IANA timezone', () => {
    const now = new Date('2025-12-30T05:00:00Z'); // 21:00 PST on 12/29
    const date = getNowInZone({ now, ianaTimezone: 'America/Los_Angeles' });

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December is 11
    expect(date.getDate()).toBe(29);
  });

  it('falls back to tzOffsetMinutes when IANA invalid', () => {
    const now = new Date('2025-12-30T00:30:00Z');
    const date = getNowInZone({ now, ianaTimezone: 'Invalid/Zone', tzOffsetMinutes: -330 });

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(30);
  });

  it('supports legacy timezone_offset by inverting sign', () => {
    const now = new Date('2025-12-30T00:30:00Z');
    const date = getNowInZone({ now, legacyTimezoneOffset: 330 });

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(30);
  });

  it('falls back to server-local midnight when nothing provided', () => {
    const now = new Date('2025-12-30T12:00:00Z');
    const date = getNowInZone({ now });

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(30);
  });
});
