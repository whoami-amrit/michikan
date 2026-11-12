import { type ICreateResumeDtoInput, type IFinding, type IResumeAnalysisSnapshot } from 'shared';

import { type IResolvedFinding, resolveFinding } from '@/lib/resume-lint';

type ResumeJsonType = ICreateResumeDtoInput['json'];

export interface IGroupedFinding {
  finding: IFinding;
  resolved?: IResolvedFinding;
}

export interface IFindingGroup {
  sectionId: string;
  title: string;
  findings: IGroupedFinding[];
}

const SECTION_ORDER = ['PI', 'SUM', 'SK', 'E', 'P', 'ED'] as const;
const SECTION_ID = /^(PI|SUM|SK|ED|E|P)(\d+)?(?:\.(\d+))?$/;

interface ISectionRank {
  section: number;
  entry: number;
  bullet: number;
}

function sectionRank(sectionId: string): ISectionRank {
  const match = SECTION_ID.exec(sectionId);
  if (!match) {
    return { section: SECTION_ORDER.length, entry: 0, bullet: 0 };
  }

  const [, kind, entry, bullet] = match;
  return {
    section: SECTION_ORDER.indexOf(kind as (typeof SECTION_ORDER)[number]),
    entry: Number(entry ?? 0),
    bullet: Number(bullet ?? 0),
  };
}

const compareRank = (a: ISectionRank, b: ISectionRank) =>
  a.section - b.section || a.entry - b.entry || a.bullet - b.bullet;

const named = (name: string | undefined, index: number) => (name?.trim() ? name : `#${index + 1}`);

function groupTitle(groupId: string, json: ResumeJsonType | undefined): string {
  const match = SECTION_ID.exec(groupId);
  const kind = match?.[1];
  const index = Number(match?.[2]) - 1;

  switch (kind) {
    case 'PI':
      return 'Personal info';
    case 'SUM':
      return 'Summary';
    case 'SK':
      return 'Skills';
    case 'E':
      return `Experience: ${named(json?.experience?.[index]?.company, index)}`;
    case 'P':
      return `Project: ${named(json?.projects?.[index]?.title, index)}`;
    case 'ED':
      return `Education: ${named(json?.education?.[index]?.institution, index)}`;
    default:
      return groupId;
  }
}

export function groupFindings(
  snapshot: IResumeAnalysisSnapshot,
  resumeJson: unknown,
): IFindingGroup[] {
  const json = resumeJson as ResumeJsonType | undefined;
  const groups = new Map<string, IFindingGroup>();

  const ordered = snapshot.findings
    .map((finding, position) => ({ finding, position, rank: sectionRank(finding.section_id) }))
    .sort((a, b) => compareRank(a.rank, b.rank) || a.position - b.position);

  for (const { finding } of ordered) {
    const groupId = finding.section_id.split('.')[0] ?? finding.section_id;
    let group = groups.get(groupId);

    if (!group) {
      group = { sectionId: groupId, title: groupTitle(groupId, json), findings: [] };
      groups.set(groupId, group);
    }

    group.findings.push({ finding, resolved: resolveFinding(finding, snapshot.idMap, json) });
  }

  return [...groups.values()];
}
