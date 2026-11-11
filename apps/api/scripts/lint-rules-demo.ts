/**
 * Demonstrates the deterministic resume linter (`lintResume`): every one of the 16 codes fires
 * on a positive example and stays silent on a negative one, plus the known false-positive traps
 * and the 5 ms performance target. Exits non-zero on any failure. Not a test suite.
 *
 *   pnpm --filter shared build           # once, and after changing packages/shared
 *   pnpm --filter api demo:lint-rules
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type Finding,
  LINT_ISSUE_CODES,
  type LintableResume,
  type LintIssueCode,
  lintResume,
  ResumeJsonSchema,
} from 'shared';

const bullets = (...lines: string[]): LintableResume => ({
  experience: [{ highlights: lines.join('\n') }],
});
const skills = (...groups: string[]): LintableResume => ({
  skills: groups.map((group) => ({ category: 'Skills', skills: group })),
});

interface Case {
  code: LintIssueCode;
  positive: LintableResume;
  negative: LintableResume;
  /** section_id the positive example must land on */
  at: string;
}

const CASES: Case[] = [
  {
    code: 'PRONOUN',
    positive: bullets('Built a cache that my team used'),
    negative: bullets('Built a cache for CI/CD and I/O heavy US-based services at Internal Tools'),
    at: 'E1.1',
  },
  {
    code: 'TRAILING_PERIOD',
    positive: bullets('Built a cache.'),
    negative: bullets(
      'Built a cache',
      'Cut costs, etc.',
      'Wrote docs (e.g. ADRs, i.e. the lot)...',
      'Built v2',
    ),
    at: 'E1.1',
  },
  {
    code: 'SYMBOL',
    positive: bullets('Designed UX & built client/server tooling'),
    negative: bullets(
      "Built CI/CD, I/O and TCP/IP tooling for R&D and the 24/7 on-call, the team's users' data",
    ),
    at: 'E1.1',
  },
  {
    code: 'SPELLED_NUMBER',
    positive: bullets('Managed three services and five engineers'),
    negative: bullets(
      'Managed 3 services',
      'No one, one of us, one-click deploys',
      'Raised $2 million at Two Sigma',
    ),
    at: 'E1.1',
  },
  {
    code: 'WEAK_VERB',
    positive: bullets('Helped ship the billing service'),
    negative: bullets('Shipped the billing service', 'Ranked results by relevance'),
    at: 'E1.1',
  },
  {
    code: 'OVERWROUGHT_VERB',
    positive: bullets('Spearheaded the billing rewrite'),
    negative: bullets(
      'Led the billing rewrite',
      'Rewrote the billing service, spearheaded nothing',
    ),
    at: 'E1.1',
  },
  {
    code: 'BANNED_VERB',
    positive: bullets('Utilized Redis to cut latency'),
    negative: bullets('Used Redis to cut latency', 'Shipped an enhancement'),
    at: 'E1.1',
  },
  {
    code: 'B_WORD',
    positive: bullets('Built a robust and unique queue'),
    negative: bullets('Built a queue that retries failed jobs'),
    at: 'E1.1',
  },
  {
    code: 'LONG_BULLET',
    positive: bullets(`Built ${'a very long description '.repeat(9)}`),
    negative: bullets('Built a queue that retries failed jobs'),
    at: 'E1.1',
  },
  {
    code: 'LEGACY_EMAIL',
    positive: { personalInfo: { email: 'me@yahoo.co.uk' } },
    negative: { personalInfo: { email: 'me@proton.me' } },
    at: 'PI',
  },
  {
    code: 'SKILL_AMALGAM',
    positive: skills('HTML/CSS, C/C++, Python | Go'),
    negative: skills('HTML, CSS, C, C++, CI/CD'),
    at: 'SK',
  },
  {
    code: 'SKILL_PROFICIENCY',
    positive: skills('Proficient in Python, Go'),
    negative: skills('Python, Go'),
    at: 'SK',
  },
  {
    code: 'SOFT_SKILL',
    positive: skills('Python, Leadership, Problem Solving'),
    negative: skills('Python, Go'),
    at: 'SK',
  },
  {
    code: 'BASIC_SKILL',
    positive: skills('Python, Microsoft Word, Excel'),
    negative: skills('Python, Windows Server, Excel Services API'),
    at: 'SK',
  },
  {
    code: 'GITHUB_AS_SKILL',
    positive: skills('Python, GitHub'),
    negative: skills('Python, Git, GitHub'),
    at: 'SK',
  },
  {
    code: 'PROJECT_IN_TITLE',
    positive: { projects: [{ title: 'Ledger Project', highlights: 'Built a ledger' }] },
    negative: { projects: [{ title: 'Ledger', highlights: 'Built a ledger for Projects' }] },
    at: 'P1',
  },
];

let failures = 0;
const check = (ok: boolean, message: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) failures++;
};
const fixOk = (finding: Finding) => finding.fix.trim().split(/\s+/).length <= 10;

for (const { code, positive, negative, at } of CASES) {
  const hits = lintResume(positive).filter((finding) => finding.issue === code);
  check(
    hits.length > 0 && hits.every((finding) => finding.section_id === at && fixOk(finding)),
    `${code} fires at ${at}${hits[0] ? `: "${hits[0].fix}"` : ''}`,
  );
  check(
    lintResume(negative).every((finding) => finding.issue !== code),
    `${code} silent on the negative example`,
  );
}

check(
  LINT_ISSUE_CODES.every((code) => CASES.some((c) => c.code === code)) &&
    CASES.length === LINT_ISSUE_CODES.length,
  `all ${LINT_ISSUE_CODES.length} codes are demonstrated`,
);

// false positives named in the ticket: no PRONOUN or TRAILING_PERIOD
const traps = lintResume(
  bullets('Built CI/CD pipelines', 'Cut costs, etc.', 'Internal Tools Engineer'),
);
check(
  traps.every((f) => f.issue !== 'PRONOUN' && f.issue !== 'TRAILING_PERIOD'),
  '"CI/CD", "etc." and "Internal" raise no PRONOUN or TRAILING_PERIOD',
);

// a line can carry several findings, sources are always 'linter'
const multi = lintResume(bullets('Utilized my robust cache.'));
check(
  ['BANNED_VERB', 'PRONOUN', 'B_WORD', 'TRAILING_PERIOD'].every((code) =>
    multi.some((f) => f.issue === code),
  ) && multi.every((f) => f.source === 'linter'),
  `one line carries several findings (${multi.map((f) => f.issue).join(', ')})`,
);

// null / missing fields (half-filled forms) must not throw
check(
  lintResume({
    personalInfo: { email: null },
    skills: [{ category: '', skills: '' }],
    experience: [{}],
  }).length === 0,
  'empty and null fields are safe',
);

// performance on the child spec §3.3 example resume
const golden = ResumeJsonSchema.parse(
  JSON.parse(readFileSync(join(__dirname, 'fixtures', 'golden.json'), 'utf8')),
);
lintResume(golden); // warm up
const RUNS = 200;
const start = process.hrtime.bigint();
for (let i = 0; i < RUNS; i++) lintResume(golden);
const perRunMs = Number(process.hrtime.bigint() - start) / 1e6 / RUNS;
check(perRunMs < 5, `lintResume on the §3.3 example: ${perRunMs.toFixed(3)} ms (target < 5 ms)`);
console.log(
  `golden findings: ${
    lintResume(golden)
      .map((f) => `${f.section_id}:${f.issue}`)
      .join(', ') || 'none'
  }`,
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
