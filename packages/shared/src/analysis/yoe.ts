export interface IYoeEntry {
  title: string;
  startDate: string;
  endDate?: string | undefined;
}

const INTERN_TITLE = /\bintern(ship)?\b/i;
const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;

interface IDateRange {
  start: number;
  end: number;
}

export function computeYoe(experience: readonly IYoeEntry[] | undefined, now: Date): number {
  const nowMs = now.getTime();
  const ranges: IDateRange[] = [];

  for (const entry of experience ?? []) {
    if (INTERN_TITLE.test(entry.title)) {
      continue;
    }

    const start = Date.parse(entry.startDate);
    const end = entry.endDate ? Date.parse(entry.endDate) : nowMs;
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      continue;
    }

    ranges.push({ start, end });
  }

  ranges.sort((a, b) => a.start - b.start);

  let totalMs = 0;
  let currentRange: IDateRange | undefined;
  for (const range of ranges) {
    if (currentRange && range.start <= currentRange.end) {
      currentRange.end = Math.max(currentRange.end, range.end);
    } else {
      if (currentRange) {
        totalMs += currentRange.end - currentRange.start;
      }
      currentRange = { start: range.start, end: range.end };
    }
  }
  if (currentRange) {
    totalMs += currentRange.end - currentRange.start;
  }

  const years = totalMs / (MS_PER_MONTH * 12);
  return Math.round(years * 10) / 10;
}
