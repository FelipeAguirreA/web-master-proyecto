/**
 * Pure helper functions for the empresa calendar redesign.
 * No imports from next/* — safe to unit-test with Vitest.
 */

/** "YYYY-MM-DD" from a Date in local time */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" to { year, month (0-based), day } */
export function parseDateStr(s: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month: month - 1, day };
}

/** Return ISO "YYYY-MM-DD" for each day (Mon–Sun) of the week containing `date`. */
export function getWeekDays(date: Date): string[] {
  const d = new Date(date);
  // getDay(): 0=Sun,1=Mon,...,6=Sat → shift so Mon=0
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toLocalDateStr(day);
  });
}

/** Return the first day of the week (Monday) containing `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Advance `weekStart` by `delta` weeks (+1 / -1). */
export function shiftWeek(weekStart: Date, delta: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

/** Convert "HH:MM" to total minutes from midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Format minutes-from-midnight to "HH:MM". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Extract "HH:MM" from an ISO datetime string, in local time. */
export function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** How many minutes past midnight is "now"? */
export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const SHORT_MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const DAYS_ES_SHORT = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

export { MONTHS_ES, DAYS_ES_SHORT };

/** Format a week range label: "12–16 may · 2026" */
export function weekRangeLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const d1 = weekStart.getDate();
  const d2 = weekEnd.getDate();
  const m1 = SHORT_MONTHS_ES[weekStart.getMonth()];
  const m2 = SHORT_MONTHS_ES[weekEnd.getMonth()];
  const y = weekEnd.getFullYear();

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${d1}–${d2} ${m1} · ${y}`;
  }
  return `${d1} ${m1} – ${d2} ${m2} · ${y}`;
}

/** Build the cell grid for a mini-month calendar.
 *  Returns an array of 35 or 42 items; null = empty cell. */
export function buildMonthCells(
  year: number,
  month: number,
): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  // 0=Sun → shift so Mon=0
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Returns true when the interview has fully ended.
 *  An interview ends at scheduledAt + durationMins.
 *  Pass `now` (ms since epoch) to make tests deterministic; defaults to Date.now(). */
export function isInterviewPast(
  scheduledAt: string,
  durationMins: number,
  now: number = Date.now(),
): boolean {
  const endMs = new Date(scheduledAt).getTime() + durationMins * 60_000;
  return endMs < now;
}

/** Given an Interview's scheduledAt ISO string and durationMins,
 *  return { dateStr, startMin, endMin } */
export function interviewTimeSlot(
  scheduledAt: string,
  durationMins: number,
): {
  dateStr: string;
  startMin: number;
  endMin: number;
} {
  const d = new Date(scheduledAt);
  const dateStr = toLocalDateStr(d);
  const startMin = d.getHours() * 60 + d.getMinutes();
  const endMin = startMin + durationMins;
  return { dateStr, startMin, endMin };
}
