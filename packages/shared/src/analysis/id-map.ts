import { splitHighlights } from './highlights';
import type { JsonPathType, MaybeType, SectionIdType } from './types';

export interface ILooseResumeJson {
  summary?: unknown;
  skills?: MaybeType<readonly { category?: MaybeType<string>; skills?: MaybeType<string> }[]>;
  experience?: MaybeType<readonly { highlights?: MaybeType<string> }[]>;
  projects?: MaybeType<readonly { highlights?: MaybeType<string> }[]>;
  education?: MaybeType<readonly unknown[]>;
}

export function buildIdMap(json: ILooseResumeJson): Record<SectionIdType, JsonPathType> {
  const idMap: Record<SectionIdType, JsonPathType> = { PI: 'personalInfo' };

  if (typeof json.summary === 'string' && json.summary.trim()) {
    idMap.SUM = 'summary';
  }

  const hasSkills = (json.skills ?? []).some(
    (entry) => Boolean(entry.category?.trim()) || Boolean(entry.skills?.trim()),
  );
  if (hasSkills) {
    idMap.SK = 'skills';
  }

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
