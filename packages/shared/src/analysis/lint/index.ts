import { splitHighlights } from '../highlights';
import type { ILooseResumeJson } from '../id-map';
import type { IFinding } from '../snapshot';
import type { LintIssueCodeType, MaybeType, SectionIdType } from '../types';
import {
  B_ADJECTIVES,
  B_ADVERBS,
  BANNED_VERBS,
  BASIC_SKILLS,
  OVERWROUGHT_VERBS,
  PROFICIENCY_PHRASES,
  SOFT_SKILLS,
  WEAK_VERBS,
} from './wordlists';

export const MAX_BULLET_CHARS = 200;

export interface ILintableResumeJson extends ILooseResumeJson {
  personalInfo?: MaybeType<{ email?: MaybeType<string> }>;
  projects?: MaybeType<readonly { title?: MaybeType<string>; highlights?: MaybeType<string> }[]>;
}

const lowerSet = (words: readonly string[]) => new Set(words.map((word) => word.toLowerCase()));

const B_WORDS = lowerSet([...B_ADJECTIVES, ...B_ADVERBS]);
const SOFT_SKILL_SET = lowerSet(SOFT_SKILLS);
const BASIC_SKILL_SET = lowerSet(BASIC_SKILLS);

const PRONOUN_REGEX = /^(?:i|me|my|we|us|our|their)(?:['’](?:m|ve|ll|d|re|s))?$/i;

const ABBREVIATIONS = new Set([
  'etc.',
  'al.',
  'vs.',
  'approx.',
  'inc.',
  'ltd.',
  'corp.',
  'co.',
  'dr.',
  'mr.',
  'mrs.',
  'ms.',
  'jr.',
  'sr.',
  'st.',
  'no.',
]);
const DOTTED_ABBREVIATION_REGEX = /^(?:[a-z]\.){2,}$/i;

const NUMBER_WORDS = lowerSet([
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'hundred',
  'thousand',
  'million',
]);
const MAGNITUDES = new Set(['hundred', 'thousand', 'million']);
const ONE_PREV_SKIP = lowerSet(['no', 'any', 'every', 'each', 'the', 'this', 'that', 'at']);
const ONE_NEXT_SKIP = lowerSet([
  'of',
  'another',
  'or',
  'and',
  'to',
  'by',
  'in',
  'on',
  'at',
  'for',
  'that',
  'who',
  'which',
  'with',
  'from',
  'as',
  'is',
  'was',
  'but',
  'more',
  'can',
  'will',
  'would',
  'could',
  'should',
  'has',
  'had',
]);

const SLASH_WORDS_REGEX = /^[A-Za-z]{2,}(?:\/[A-Za-z]{2,})+$/;
const ALL_CAPS_REGEX = /^[A-Z]+$/;

const BANNED_VERB_STEMS = BANNED_VERBS.map((verb) => verb.slice(0, -1).toLowerCase());
const BANNED_VERB_REGEX = new RegExp(
  `\\b(?:${BANNED_VERB_STEMS.join('|')})(?:e|es|ed|ing)\\b`,
  'gi',
);

const LEADING_MARKER_REGEX = /^[\s\-–—•*·]+/;
const WORD_START_REGEX = /^[a-z0-9]/i;
const EDGE_PUNCTUATION_REGEX = /^[("'`[{“‘<]+|[)"'`\]}”’>.,;:!?]+$/g;
const LETTER_REGEX = /\p{L}/u;
const DIGIT_REGEX = /\d/;

const LEGACY_EMAIL_DOMAIN_REGEX = /^(?:aol\.com|hotmail\.com|yahoo\.[a-z.]+)$/;

const SKILL_SLASH_ALLOWLIST = lowerSet(['CI/CD', 'TCP/IP', 'I/O']);

const verbMatcher = (verbs: readonly string[]) => verbs.map((verb) => verb.toLowerCase());
const WEAK_VERB_PHRASES = verbMatcher(WEAK_VERBS);
const OVERWROUGHT_VERB_PHRASES = verbMatcher(OVERWROUGHT_VERBS);

const PROFICIENCY_MATCHERS = PROFICIENCY_PHRASES.map(
  (phrase) => new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i'),
);
const PROJECT_WORD_REGEX = /\bproject\b/i;

function stripEdges(chunk: string): string {
  return chunk.replace(EDGE_PUNCTUATION_REGEX, '');
}

function chunksOf(line: string): string[] {
  return line.split(/\s+/).map(stripEdges).filter(Boolean);
}

function wordsOf(line: string): string[] {
  return line
    .split(/\s+/)
    .flatMap((chunk) => chunk.split(/[/–—]/))
    .map(stripEdges)
    .filter(Boolean);
}

class LineFindings {
  private readonly seen = new Set<string>();

  constructor(
    private readonly sectionId: SectionIdType,
    private readonly out: IFinding[],
  ) {}

  add(issue: LintIssueCodeType, key: string, fix: string): void {
    const id = `${issue}:${key.toLowerCase()}`;
    if (this.seen.has(id)) {
      return;
    }
    this.seen.add(id);
    this.out.push({ source: 'linter', section_id: this.sectionId, issue, fix });
  }
}

function pronouns(line: string): string[] {
  return chunksOf(line).filter((chunk) => chunk !== 'US' && PRONOUN_REGEX.test(chunk));
}

function hasTrailingPeriod(line: string): boolean {
  if (!line.endsWith('.') || line.endsWith('..')) {
    return false;
  }

  const last = line.slice(line.lastIndexOf(' ') + 1);
  return !(ABBREVIATIONS.has(last.toLowerCase()) || DOTTED_ABBREVIATION_REGEX.test(last));
}

function symbols(line: string): string[] {
  const found: string[] = [];

  if (/(?:^|\s)&(?:\s|$)/.test(line)) {
    found.push('&');
  }

  if (chunksOf(line).some(isSlashedWords)) {
    found.push('/');
  }

  for (let i = 0; i < line.length; i++) {
    if (line[i] !== "'" && line[i] !== '’') {
      continue;
    }
    if (isStrayApostrophe(line, i)) {
      found.push("'");
      break;
    }
  }

  return found;
}

function isSlashedWords(chunk: string): boolean {
  if (!SLASH_WORDS_REGEX.test(chunk)) {
    return false;
  }
  return !chunk.split('/').every((part) => ALL_CAPS_REGEX.test(part));
}

function isStrayApostrophe(line: string, index: number): boolean {
  const prev = line[index - 1] ?? '';
  const next = line[index + 1] ?? '';

  if (LETTER_REGEX.test(prev) && LETTER_REGEX.test(next)) {
    return false;
  }
  if ((prev === 's' || prev === 'S') && !LETTER_REGEX.test(next)) {
    return false;
  }
  if (DIGIT_REGEX.test(next)) {
    return false;
  }
  return true;
}

function spelledNumbers(line: string): string[] {
  const chunks = chunksOf(line);
  const found: string[] = [];

  chunks.forEach((chunk, i) => {
    const lower = chunk.toLowerCase();
    if (!NUMBER_WORDS.has(lower)) {
      return;
    }

    if (i > 0 && chunk !== lower) {
      return;
    }

    const prev = chunks[i - 1]?.toLowerCase();
    const next = chunks[i + 1]?.toLowerCase();

    if (MAGNITUDES.has(lower) && prev !== undefined && DIGIT_REGEX.test(prev.slice(-1))) {
      return;
    }

    if (lower === 'one') {
      if (next === undefined || ONE_NEXT_SKIP.has(next)) {
        return;
      }
      if (prev !== undefined && ONE_PREV_SKIP.has(prev)) {
        return;
      }
    }

    found.push(chunk);
  });

  return found;
}

function openingPhrase(line: string, phrases: readonly string[]): string | undefined {
  const start = line.replace(LEADING_MARKER_REGEX, '');
  const lower = start.toLowerCase();

  for (const phrase of phrases) {
    if (!lower.startsWith(phrase)) {
      continue;
    }
    if (WORD_START_REGEX.test(lower.slice(phrase.length, phrase.length + 1))) {
      continue;
    }
    return start.slice(0, phrase.length);
  }
  return undefined;
}

function lintBullet(sectionId: SectionIdType, line: string, out: IFinding[]): void {
  const found = new LineFindings(sectionId, out);

  for (const word of pronouns(line)) {
    found.add('PRONOUN', word, `Remove "${word}"`);
  }

  if (hasTrailingPeriod(line)) {
    found.add('TRAILING_PERIOD', '', 'Remove the trailing period');
  }

  for (const symbol of symbols(line)) {
    found.add('SYMBOL', symbol, `Replace "${symbol}" with words`);
  }

  for (const word of spelledNumbers(line)) {
    found.add('SPELLED_NUMBER', word, `Write "${word}" as digits`);
  }

  const weak = openingPhrase(line, WEAK_VERB_PHRASES);
  if (weak) {
    found.add('WEAK_VERB', weak, `Replace "${weak}" with a stronger action verb`);
  }

  const overwrought = openingPhrase(line, OVERWROUGHT_VERB_PHRASES);
  if (overwrought) {
    found.add('OVERWROUGHT_VERB', overwrought, `Replace "${overwrought}" with a plain action verb`);
  }

  for (const [verb] of line.matchAll(BANNED_VERB_REGEX)) {
    found.add('BANNED_VERB', verb.slice(0, 5), `Drop "${verb}"; lead with what you built`);
  }

  lintBWords(line, found);

  if (line.length > MAX_BULLET_CHARS) {
    found.add('LONG_BULLET', '', `Shorten to under ${MAX_BULLET_CHARS} characters`);
  }
}

function lintBWords(line: string, found: LineFindings): void {
  for (const word of wordsOf(line)) {
    if (B_WORDS.has(word.toLowerCase())) {
      found.add('B_WORD', word, `Delete "${word}"`);
    }
  }
}

function lintSummary(summary: string, out: IFinding[]): void {
  const found = new LineFindings('SUM', out);

  for (const word of pronouns(summary)) {
    found.add('PRONOUN', word, `Remove "${word}"`);
  }

  lintBWords(summary, found);
}

function lintEmail(email: string, out: IFinding[]): void {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  if (email.includes('@') && LEGACY_EMAIL_DOMAIN_REGEX.test(domain)) {
    out.push({
      source: 'linter',
      section_id: 'PI',
      issue: 'LEGACY_EMAIL',
      fix: 'Use a modern email provider',
    });
  }
}

type SkillGroupsType = NonNullable<ILintableResumeJson['skills']>;

function lintSkills(groups: SkillGroupsType, out: IFinding[]): void {
  const entries = groups
    .map((group) => ({
      category: group.category?.trim() ?? '',
      skills: group.skills?.trim() ?? '',
    }))
    .filter((group) => group.category || group.skills);
  if (entries.length === 0) {
    return;
  }

  const found = new LineFindings('SK', out);

  for (const { skills } of entries) {
    for (const item of skills.split(/[,;\n]/)) {
      const token = item.trim();
      if (token.includes('|')) {
        found.add('SKILL_AMALGAM', '|', 'List "|" as separate skills');
      } else if (/\S\/\S/.test(token) && !SKILL_SLASH_ALLOWLIST.has(token.toLowerCase())) {
        found.add('SKILL_AMALGAM', token, `List "${token}" as separate skills`);
      }
    }
  }

  for (const { category, skills } of entries) {
    for (const matcher of PROFICIENCY_MATCHERS) {
      const phrase = matcher.exec(`${category} ${skills}`)?.[0];
      if (phrase) {
        found.add('SKILL_PROFICIENCY', phrase, `Remove "${phrase}"`);
      }
    }
  }

  const items = entries.flatMap(({ skills }) =>
    skills
      .split(/[,;|/\n]/)
      .map((item) => item.trim().replace(/\s+/g, ' '))
      .filter(Boolean),
  );

  for (const item of items) {
    if (SOFT_SKILL_SET.has(item.toLowerCase().replace(/-/g, ' '))) {
      found.add('SOFT_SKILL', item, `Remove soft skill "${item}"`);
    }
  }
  for (const item of items) {
    if (BASIC_SKILL_SET.has(item.toLowerCase())) {
      found.add('BASIC_SKILL', item, `Remove "${item}"`);
    }
  }

  const lowered = new Set(items.map((item) => item.toLowerCase()));
  if (lowered.has('github') && !lowered.has('git')) {
    found.add('GITHUB_AS_SKILL', '', 'List Git instead of GitHub');
  }
}

export function lintResume(json: ILintableResumeJson): IFinding[] {
  const out: IFinding[] = [];

  const email = json.personalInfo?.email?.trim();
  if (email) {
    lintEmail(email, out);
  }

  const summary =
    typeof json.summary === 'string' ? json.summary.trim().replace(/\s*\r?\n\s*/g, ' ') : '';
  if (summary) {
    lintSummary(summary, out);
  }

  if (json.skills) {
    lintSkills(json.skills, out);
  }

  (json.experience ?? []).forEach((entry, i) => {
    splitHighlights(entry.highlights).forEach((line, m) => {
      lintBullet(`E${i + 1}.${m + 1}`, line, out);
    });
  });

  (json.projects ?? []).forEach((entry, i) => {
    const title = entry.title?.trim();
    if (title && PROJECT_WORD_REGEX.test(title)) {
      out.push({
        source: 'linter',
        section_id: `P${i + 1}`,
        issue: 'PROJECT_IN_TITLE',
        fix: 'Remove "Project" from the title',
      });
    }

    splitHighlights(entry.highlights).forEach((line, m) => {
      lintBullet(`P${i + 1}.${m + 1}`, line, out);
    });
  });

  return out;
}
