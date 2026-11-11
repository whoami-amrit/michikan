import { splitHighlights } from './highlights';
import type { JsonPath, SectionId } from './types';

type Maybe<T> = T | null | undefined;

export interface IdMapSource {
  summary?: unknown;
  skills?: Maybe<readonly { category?: Maybe<string>; skills?: Maybe<string> }[]>;
  experience?: Maybe<readonly { highlights?: Maybe<string> }[]>;
  projects?: Maybe<readonly { highlights?: Maybe<string> }[]>;
  education?: Maybe<readonly unknown[]>;
}

export function buildIdMap(json: IdMapSource): Record<SectionId, JsonPath> {
  const idMap: Record<SectionId, JsonPath> = { PI: 'personalInfo' };

  if (typeof json.summary === 'string' && json.summary.trim()) idMap.SUM = 'summary';

  const hasSkills = (json.skills ?? []).some(
    (entry) => Boolean(entry.category?.trim()) || Boolean(entry.skills?.trim()),
  );
  if (hasSkills) idMap.SK = 'skills';

  (json.experience ?? []).forEach((entry, i) => {
    idMap[`E${i + 1}`] = `experience[${i}]`;
    splitHighlights(entry.highlights).forEach((_, m) => {
      idMap[`E${i + 1}.${m + 1}`] = `experience[${i}].highlights#${m}`;
    });
  });

  (json.projects ?? []).forEach((entry, i) => {
    idMap[`P${i + 1}`] = `projects[${i}]`;
    splitHighlights(entry.highlights).forEach((_, m) => {
      idMap[`P${i + 1}.${m + 1}`] = `projects[${i}].highlights#${m}`;
    });
  });

  (json.education ?? []).forEach((_, i) => {
    idMap[`ED${i + 1}`] = `education[${i}]`;
  });

  return idMap;
}
