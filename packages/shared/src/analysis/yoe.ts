export interface YoeEntry {
  title: string;
  startDate: string;
  endDate?: string | undefined;
  isCurrentRole?: boolean | undefined;
}

const INTERN_TITLE = /\bintern(ship)?\b/i;
const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;

export function computeYoe(experience: readonly YoeEntry[] | undefined, now: Date): number {
  const nowMs = now.getTime();
  const ranges: [number, number][] = [];

  for (const entry of experience ?? []) {
    if (INTERN_TITLE.test(entry.title)) {
      continue;
    }

    const start = Date.parse(entry.startDate);
    const end = entry.isCurrentRole || !entry.endDate ? nowMs : Date.parse(entry.endDate);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      continue;
    }

    ranges.push([start, end]);
  }

  ranges.sort((a, b) => a[0] - b[0]);

  let totalMs = 0;
  let current: [number, number] | undefined;
  for (const range of ranges) {
    if (current && range[0] <= current[1]) {
      current[1] = Math.max(current[1], range[1]);
    } else {
      if (current) {
        totalMs += current[1] - current[0];
      }
      current = [range[0], range[1]];
    }
  }
  if (current) {
    totalMs += current[1] - current[0];
  }

  const years = totalMs / MS_PER_MONTH / 12;
  return Math.round(years * 10) / 10;
}
