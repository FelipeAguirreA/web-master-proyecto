import { describe, it, expect } from "vitest";
import {
  toLocalDateStr,
  parseDateStr,
  getWeekDays,
  getWeekStart,
  shiftWeek,
  timeToMinutes,
  minutesToTime,
  isoToLocalTime,
  weekRangeLabel,
  buildMonthCells,
  interviewTimeSlot,
  isInterviewPast,
} from "@/components/dashboard/calendar/calendarHelpers";

// ─── toLocalDateStr ────────────────────────────────────────────────────────────

describe("toLocalDateStr", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toLocalDateStr(new Date(2026, 4, 12))).toBe("2026-05-12"); // May = 4
  });

  it("zero-pads month and day", () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

// ─── parseDateStr ─────────────────────────────────────────────────────────────

describe("parseDateStr", () => {
  it("returns year, 0-based month, and day", () => {
    expect(parseDateStr("2026-05-14")).toEqual({
      year: 2026,
      month: 4,
      day: 14,
    });
  });
});

// ─── getWeekStart ─────────────────────────────────────────────────────────────

describe("getWeekStart", () => {
  it("returns Monday for a mid-week date", () => {
    // Wed 13 May 2026 → Mon 11 May 2026
    const result = getWeekStart(new Date(2026, 4, 13));
    expect(toLocalDateStr(result)).toBe("2026-05-11");
  });

  it("returns the same Monday for a Monday input", () => {
    const result = getWeekStart(new Date(2026, 4, 11));
    expect(toLocalDateStr(result)).toBe("2026-05-11");
  });

  it("returns the correct Monday for a Sunday input", () => {
    // Sun 17 May 2026 → Mon 11 May 2026
    const result = getWeekStart(new Date(2026, 4, 17));
    expect(toLocalDateStr(result)).toBe("2026-05-11");
  });
});

// ─── getWeekDays ──────────────────────────────────────────────────────────────

describe("getWeekDays", () => {
  it("returns 7 days starting on Monday", () => {
    const days = getWeekDays(new Date(2026, 4, 12)); // Tue
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-05-11"); // Mon
    expect(days[6]).toBe("2026-05-17"); // Sun
  });

  it("handles month boundary correctly", () => {
    // Sat 30 May → Mon 27 May – Sun 2 Jun
    const days = getWeekDays(new Date(2026, 4, 30));
    expect(days[0]).toBe("2026-05-25"); // Mon (week of Sat 30)
    expect(days[6]).toBe("2026-05-31"); // Sun
  });
});

// ─── shiftWeek ────────────────────────────────────────────────────────────────

describe("shiftWeek", () => {
  it("advances by +1 week", () => {
    const start = new Date(2026, 4, 11); // Mon 11 May
    expect(toLocalDateStr(shiftWeek(start, 1))).toBe("2026-05-18");
  });

  it("goes back by -1 week", () => {
    const start = new Date(2026, 4, 11);
    expect(toLocalDateStr(shiftWeek(start, -1))).toBe("2026-05-04");
  });
});

// ─── timeToMinutes / minutesToTime ────────────────────────────────────────────

describe("timeToMinutes", () => {
  it("converts '09:30' to 570", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });

  it("converts '00:00' to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts '23:59' to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToTime", () => {
  it("converts 570 to '09:30'", () => {
    expect(minutesToTime(570)).toBe("09:30");
  });

  it("zero-pads hours and minutes", () => {
    expect(minutesToTime(65)).toBe("01:05");
  });
});

// ─── isoToLocalTime ───────────────────────────────────────────────────────────

describe("isoToLocalTime", () => {
  it("extracts local HH:MM from ISO string", () => {
    // Build a date at 14:30 local time to avoid TZ dependency
    const d = new Date(2026, 4, 12, 14, 30, 0);
    const iso = d.toISOString();
    // isoToLocalTime re-parses with new Date() so it stays local
    expect(isoToLocalTime(iso)).toBe("14:30");
  });
});

// ─── weekRangeLabel ───────────────────────────────────────────────────────────

describe("weekRangeLabel", () => {
  it("produces a single-month label", () => {
    // Mon 11 May 2026 → "11–17 may · 2026"
    const label = weekRangeLabel(new Date(2026, 4, 11));
    expect(label).toBe("11–17 may · 2026");
  });

  it("produces a cross-month label", () => {
    // Mon 27 Apr → Sun 3 May 2026
    const label = weekRangeLabel(new Date(2026, 3, 27));
    expect(label).toBe("27 abr – 3 may · 2026");
  });
});

// ─── buildMonthCells ──────────────────────────────────────────────────────────

describe("buildMonthCells", () => {
  it("returns a multiple-of-7 length array", () => {
    const cells = buildMonthCells(2026, 4); // May 2026
    expect(cells.length % 7).toBe(0);
  });

  it("starts with the right number of nulls", () => {
    // 1 May 2026 is Friday → Mon=0 offset=4
    const cells = buildMonthCells(2026, 4);
    const nulls = cells.findIndex((c) => c !== null);
    expect(nulls).toBe(4);
  });

  it("contains exactly daysInMonth non-null values", () => {
    const cells = buildMonthCells(2026, 1); // Feb 2026 = 28 days
    const nonNull = cells.filter((c) => c !== null);
    expect(nonNull).toHaveLength(28);
  });
});

// ─── isInterviewPast ──────────────────────────────────────────────────────────

describe("isInterviewPast", () => {
  // Anchor: interview at 10:00, 60 min → ends at 11:00 (epoch ms = endMs)
  const scheduledAt = new Date(2026, 4, 12, 10, 0, 0).toISOString(); // 10:00 local
  const durationMins = 60;
  const endMs = new Date(2026, 4, 12, 11, 0, 0).getTime(); // 11:00 local

  it("returns true when now is after the interview has ended", () => {
    expect(isInterviewPast(scheduledAt, durationMins, endMs + 1)).toBe(true);
  });

  it("returns false when now is before the interview starts (future)", () => {
    const beforeStart = new Date(2026, 4, 12, 9, 59, 59).getTime();
    expect(isInterviewPast(scheduledAt, durationMins, beforeStart)).toBe(false);
  });

  it("returns false when the interview is in progress (started but not ended)", () => {
    const inProgress = new Date(2026, 4, 12, 10, 30, 0).getTime();
    expect(isInterviewPast(scheduledAt, durationMins, inProgress)).toBe(false);
  });

  it("returns false at the exact end boundary (endMs === now — still counts as not past)", () => {
    // endMs < now is the condition, so endMs === now → false
    expect(isInterviewPast(scheduledAt, durationMins, endMs)).toBe(false);
  });

  it("returns true one millisecond after the end boundary", () => {
    expect(isInterviewPast(scheduledAt, durationMins, endMs + 1)).toBe(true);
  });
});

// ─── interviewTimeSlot ────────────────────────────────────────────────────────

describe("interviewTimeSlot", () => {
  it("extracts date string, startMin and endMin", () => {
    const d = new Date(2026, 4, 12, 10, 30); // 10:30 local
    const iso = d.toISOString();
    const slot = interviewTimeSlot(iso, 60);
    expect(slot.dateStr).toBe("2026-05-12");
    expect(slot.startMin).toBe(630); // 10*60+30
    expect(slot.endMin).toBe(690); // 630+60
  });
});
