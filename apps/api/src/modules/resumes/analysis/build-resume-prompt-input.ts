import {
  buildIdMap,
  computeYoe,
  IResumeJson,
  JsonPathType,
  SectionIdType,
  splitHighlights,
} from 'shared';
import { stringify } from 'yaml';

export interface IResumePromptInput {
  payload: string;
  idMap: Record<SectionIdType, JsonPathType>;
}

const EN_DASH = '–';

function formatMonth(date: string): string {
  const ms = Date.parse(date);
  if (Number.isNaN(ms)) {
    return date.trim();
  }

  const d = new Date(ms);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

type PromptBulletsType = Record<string, string>;
type PromptSectionType = Record<string, string | PromptBulletsType>;
type PromptRootType = Record<string, string | number | PromptSectionType>;

const YAML_OPTIONS = { lineWidth: 0 };

function withoutEmpty(entries: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function bulletsById(sectionId: string, highlights: string): PromptBulletsType {
  return Object.fromEntries(
    splitHighlights(highlights).map((bullet, i) => [`${sectionId}.${i + 1}`, bullet]),
  );
}

function groupSkills(skills: IResumeJson['skills']): Record<string, string> {
  const groups: Record<string, string[]> = {};

  for (const entry of skills ?? []) {
    const category = entry.category.trim() || 'Other';
    const items = entry.skills.trim();
    if (items) {
      groups[category] = [...(groups[category] ?? []), items];
    }
  }

  return Object.fromEntries(
    Object.entries(groups).map(([category, items]) => [category, items.join(', ')]),
  );
}

export function buildResumePromptInput(json: IResumeJson, now: Date): IResumePromptInput {
  const idMap = buildIdMap(json);
  const root: PromptRootType = {
    YOE: Number(computeYoe(json.experience, now).toFixed(1)),
  };

  const summary = json.summary?.trim().replace(/\s*\r?\n\s*/g, ' ');
  if (summary) {
    root.SUM = summary;
  }

  const skillGroups = groupSkills(json.skills);
  if (Object.keys(skillGroups).length > 0) {
    root.SK = skillGroups;
  }

  (json.experience ?? []).forEach((entry, i) => {
    const id = `E${i + 1}`;
    const end = entry.endDate ? formatMonth(entry.endDate) : 'present';
    const bullets = bulletsById(id, entry.highlights);

    root[id] = {
      ...withoutEmpty({
        title: entry.title.trim(),
        company: entry.company.trim(),
        dates: `${formatMonth(entry.startDate)} ${EN_DASH} ${end}`,
      }),
      ...(Object.keys(bullets).length > 0 && { bullets }),
    };
  });

  (json.projects ?? []).forEach((entry, i) => {
    const id = `P${i + 1}`;
    const bullets = bulletsById(id, entry.highlights);

    root[id] = {
      ...withoutEmpty({
        title: entry.title.trim(),
        technologies: entry.technologies?.trim(),
      }),
      ...(Object.keys(bullets).length > 0 && { bullets }),
    };
  });

  (json.education ?? []).forEach((entry, i) => {
    root[`ED${i + 1}`] = withoutEmpty({
      degree: entry.degree.trim(),
      field: entry.field?.trim(),
      graduated: formatMonth(entry.graduationDate),
    });
  });

  return { payload: stringify(root, YAML_OPTIONS), idMap };
}
