import dayjs from "dayjs";

export function yyyymmddToIso(s: string): string {
  return s.length === 8 && !s.includes("-")
    ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    : s;
}

export function timeToMins(t: string): number {
  const [h = 0, m = 0] = t.substring(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function parsePlaytimeSessions(playtime: string | null | undefined): { start: number; end: number }[] {
  if (!playtime) return [];
  return playtime
    .split(/[,\/\n]+/)
    .flatMap((session) => {
      const parts = session.split("~");
      const startMatch = parts[0]?.match(/\d{1,2}:\d{2}/);
      const endMatch = parts[1]?.match(/\d{1,2}:\d{2}/);
      if (!startMatch) return [];
      const start = timeToMins(startMatch[0]);
      const end = endMatch ? timeToMins(endMatch[0]) : start + 60;
      return [{ start, end }];
    });
}

export function isSlotFree(startMins: number, dayIts: any[]): boolean {
  const endMins = startMins + 60;
  return dayIts.every((it) => {
    const s = timeToMins((it.start_time || it.startTime || "00:00").substring(0, 5));
    const e = timeToMins((it.end_time || it.endTime || "00:00").substring(0, 5));
    return endMins <= s || startMins >= e;
  });
}

const SLOT_SEARCH_START = 9 * 60;
const SLOT_SEARCH_END = 21 * 60;

export function findFestivalSlot(
  eventStartDate: string | undefined,
  eventEndDate: string | undefined,
  planStartDate: string,
  planEndDate: string,
  itineraries: any[],
  playtime: string | undefined,
): { itineraryDate: string; startTime: string; endTime: string } {
  const festStart = eventStartDate ? yyyymmddToIso(eventStartDate) : planStartDate;
  const festEnd = eventEndDate ? yyyymmddToIso(eventEndDate) : planEndDate;
  const rangeStart = festStart > planStartDate ? festStart : planStartDate;
  const rangeEnd = festEnd < planEndDate ? festEnd : planEndDate;

  const sessions = parsePlaytimeSessions(playtime);

  const dates: string[] = [];
  let cur = dayjs(rangeStart);
  const last = dayjs(rangeEnd);
  while (!cur.isAfter(last)) {
    dates.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }

  if (dates.length === 0) {
    return { itineraryDate: planStartDate, startTime: "09:00", endTime: "10:00" };
  }

  for (const date of dates) {
    const dayIts = itineraries.filter(
      (it) => (it.itinerary_date || it.itineraryDate) === date,
    );

    if (sessions.length > 0) {
      for (const { start } of sessions) {
        if (start >= SLOT_SEARCH_START && start + 60 <= SLOT_SEARCH_END + 60 && isSlotFree(start, dayIts)) {
          return { itineraryDate: date, startTime: minsToTime(start), endTime: minsToTime(start + 60) };
        }
      }
      for (const { start, end } of sessions) {
        const lo = Math.max(start, SLOT_SEARCH_START);
        const hi = Math.min(end - 60, SLOT_SEARCH_END);
        for (let m = lo; m <= hi; m += 30) {
          if (isSlotFree(m, dayIts)) {
            return { itineraryDate: date, startTime: minsToTime(m), endTime: minsToTime(m + 60) };
          }
        }
      }
    } else {
      for (let m = SLOT_SEARCH_START; m <= SLOT_SEARCH_END; m += 30) {
        if (isSlotFree(m, dayIts)) {
          return { itineraryDate: date, startTime: minsToTime(m), endTime: minsToTime(m + 60) };
        }
      }
    }
  }

  // 전부 찬 경우 → 첫날 마지막 일정 직후
  const firstDate = dates[0];
  const firstDayIts = itineraries
    .filter((it) => (it.itinerary_date || it.itineraryDate) === firstDate)
    .sort((a, b) =>
      timeToMins((a.end_time || a.endTime || "00:00").substring(0, 5)) -
      timeToMins((b.end_time || b.endTime || "00:00").substring(0, 5)),
    );
  const lastEnd = firstDayIts.length > 0
    ? timeToMins((firstDayIts[firstDayIts.length - 1].end_time || firstDayIts[firstDayIts.length - 1].endTime || "22:00").substring(0, 5))
    : SLOT_SEARCH_START;
  return { itineraryDate: firstDate, startTime: minsToTime(lastEnd), endTime: minsToTime(lastEnd + 60) };
}
