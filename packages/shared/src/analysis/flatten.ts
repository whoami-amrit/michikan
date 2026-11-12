import type { IResumeJson } from '../types/resume-json';
import { splitHighlights } from './highlights';
import { buildIdMap } from './id-map';
import type { JsonPath, SectionId } from './types';
import { computeYoe } from './yoe';

export interface FlattenedResume {
  payload: string;
  idMap: Record<SectionId, JsonPath>;
}

const EN_DASH = '–';

export function formatMonth(date: string): string {
  const ms = Date.parse(date);
  if (Number.isNaN(ms)) {
    return date.trim();
  }

  const d = new Date(ms);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function flattenResume(json: IResumeJson, now: Date): FlattenedResume {
  const lines: string[] = [];
  const idMap = buildIdMap(json);

  lines.push(`YOE: ${computeYoe(json.experience, now).toFixed(1)}`);

  const summary = json.summary?.trim().replace(/\s*\r?\n\s*/g, ' ');
  if (summary) {
    lines.push(`SUM: ${summary}`);
  }

  const skillGroups = (json.skills ?? [])
    .map((entry) => ({ category: entry.category.trim(), skills: entry.skills.trim() }))
    .filter((entry) => entry.category || entry.skills)
    .map((entry) => `${entry.category}: ${entry.skills}`);
  if (skillGroups.length > 0) {
    lines.push(`SK: ${skillGroups.join(' | ')}`);
  }

  (json.experience ?? []).forEach((entry, i) => {
    const id = `E${i + 1}`;
    const end = entry.endDate ? formatMonth(entry.endDate) : 'present';

    lines.push(
      `${id}: ${entry.title.trim()} @ ${entry.company.trim()}, ${formatMonth(entry.startDate)}${EN_DASH}${end}`,
    );

    splitHighlights(entry.highlights).forEach((bullet, m) => {
      lines.push(`${id}.${m + 1}: ${bullet}`);
    });
  });

  (json.projects ?? []).forEach((entry, i) => {
    const id = `P${i + 1}`;
    const technologies = entry.technologies?.trim();

    lines.push(`${id}: ${entry.title.trim()}${technologies ? ` [${technologies}]` : ''}`);

    splitHighlights(entry.highlights).forEach((bullet, m) => {
      lines.push(`${id}.${m + 1}: ${bullet}`);
    });
  });

  (json.education ?? []).forEach((entry, i) => {
    const id = `ED${i + 1}`;
    const field = entry.field?.trim();

    lines.push(
      `${id}: ${[entry.degree.trim(), field, formatMonth(entry.graduationDate)].filter(Boolean).join(', ')}`,
    );
  });

  return { payload: lines.join('\n'), idMap };
}
