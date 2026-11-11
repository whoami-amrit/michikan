/**
 * Eval for the resume analysis prompt: runs child spec §7 checks 1-10 against the real
 * OpenRouter API and prints pass/fail per check plus the total cost.
 *
 *   pnpm --filter shared build           # once, and after changing packages/shared
 *   pnpm --filter api eval:resume-prompt
 *
 * It calls the production `AiService`, so the request (provider pinning, strict schema,
 * `temperature: 0`) is exactly what the worker sends. It costs real OpenRouter credits (a few
 * cents per run) and is not part of CI. Needs OPENROUTER_API_KEY in the root `.env`; without
 * it only the offline check 1 runs and the script exits non-zero.
 *
 * Re-run it after every edit to the prompt or the response schema.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Tiktoken } from 'js-tiktoken/lite';
import o200kBase from 'js-tiktoken/ranks/o200k_base';
import {
  type Finding,
  flattenResume,
  type IResumeJson,
  type LlmFeedback,
  llmFeedbackSchema,
  postProcessLlmFindings,
  RESUME_FEEDBACK_JSON_SCHEMA,
  RESUME_FEEDBACK_SCHEMA_NAME,
  ResumeJsonSchema,
} from 'shared';
import { z } from 'zod';

import { AiService, type AiUsage } from '../src/infra/ai/ai.service';
import { RESUME_ANALYSIS_SYSTEM_PROMPT } from '../src/modules/resumes/analysis/resume-analysis.prompt';

// ---------------------------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------------------------

/** Fixed clock: the §3.3 example only yields `YOE: 4.4` on this date. */
const NOW = new Date('2026-11-11T00:00:00Z');
const FIXTURES = join(__dirname, 'fixtures');

const PREFIX_MIN_TOKENS = 1024;
const PREFIX_MAX_TOKENS = 1400;
const MAX_DETAIL_LINES = 15;
const CACHE_RETRY_DELAY_MS = 3000;
/** The second call may land on a cold replica, so a few more tries are allowed. */
const CACHE_MAX_ATTEMPTS = 4;

const GOLDEN_PAIRS: [string, string][] = [
  ['SUM', 'UNJUSTIFIED_SUMMARY'],
  ['E1.3', 'NO_RESULT'],
  ['E2.1', 'NO_RESULT'],
  ['E1.2', 'VAGUE_CLAIM'],
  ['SK', 'HIDDEN_SKILL'],
  ['SK', 'ORPHAN_SKILL'],
  ['SK', 'TECH_CASING'],
];

/** Wording that would mean a fix judges the candidate instead of the text (check 7). */
const JUDGEMENT_WORDS =
  /\b(senior|junior|seniority|competen(?:t|cy)|capable|talent(?:ed)?|potential|qualified|unqualified|ability|aptitude|(?:good|great|poor|bad) fit|job fit|strong candidate|weak candidate|experienced|inexperienced)\b/i;

const loadJson = (file: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as unknown;
const loadResume = (file: string): IResumeJson => ResumeJsonSchema.parse(loadJson(file));

const biasSchema = z.object({
  base: ResumeJsonSchema,
  piiVariants: z.array(z.object({ name: z.string(), resume: ResumeJsonSchema })),
  nameSwaps: z.array(z.object({ name: z.string(), a: ResumeJsonSchema, b: ResumeJsonSchema })),
});

// ---------------------------------------------------------------------------------------------
// calling the model
// ---------------------------------------------------------------------------------------------

interface Run {
  label: string;
  payload: string;
  raw: LlmFeedback;
  findings: Finding[];
  usage: AiUsage;
}

type Outcome = { run: Run } | { error: string };

const runs: Run[] = [];
let totalCost = 0;
let costUnknown = false;
let totalCalls = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyse(ai: AiService, label: string, json: IResumeJson): Promise<Outcome> {
  const { payload, idMap } = flattenResume(json, NOW);
  totalCalls++;

  try {
    const { data, usage } = await ai.generateJson({
      system: RESUME_ANALYSIS_SYSTEM_PROMPT,
      user: payload,
      schemaName: RESUME_FEEDBACK_SCHEMA_NAME,
      jsonSchema: RESUME_FEEDBACK_JSON_SCHEMA,
      zodSchema: llmFeedbackSchema,
    });

    if (usage.cost === null) {
      costUnknown = true;
    } else {
      totalCost += usage.cost;
    }

    const run: Run = {
      label,
      payload,
      raw: data,
      findings: postProcessLlmFindings(data, idMap),
      usage,
    };
    runs.push(run);
    return { run };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.log(`  call failed (${label}): ${message}`);
    return { error: `${label}: ${message}` };
  }
}

// ---------------------------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------------------------

interface CheckResult {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string[];
}

const pass = (id: number, name: string, details: string[] = []): CheckResult => ({
  id,
  name,
  status: 'PASS',
  details,
});
const fail = (id: number, name: string, details: string[]): CheckResult => ({
  id,
  name,
  status: 'FAIL',
  details,
});
const skip = (id: number, name: string, reason: string): CheckResult => ({
  id,
  name,
  status: 'SKIP',
  details: [reason],
});
const verdict = (id: number, name: string, ok: boolean, details: string[]): CheckResult =>
  ok ? pass(id, name, details) : fail(id, name, details);

const pairKey = (f: Pick<Finding, 'section_id' | 'issue'>) => `${f.section_id}:${f.issue}`;
const describe = (findings: Pick<Finding, 'section_id' | 'issue'>[]) =>
  findings.length === 0 ? '(none)' : findings.map(pairKey).join(', ');

/** Findings without PII, and without any section that carries a PII finding on either side. */
function withoutPii(a: Finding[], b: Finding[]): [string[], string[]] {
  const piiSections = new Set(
    [...a, ...b].filter((f) => f.issue === 'PII').map((f) => f.section_id),
  );
  const strip = (findings: Finding[]) =>
    findings
      .filter((f) => f.issue !== 'PII' && !piiSections.has(f.section_id))
      .map(pairKey)
      .sort();
  return [strip(a), strip(b)];
}

const numbersIn = (text: string) =>
  (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ''));

const NAME_1 = 'Token budget (1,024-1,400 tokens, o200k_base)';
const NAME_2 = 'Cache hit (cached_tokens >= 1,024 on a repeat call)';
const NAME_3 = 'Golden sample (exact section_id/issue pairs, in order)';
const NAME_4 = 'Clean resume returns no findings';
const NAME_5 = 'No invented numbers in fixes';
const NAME_6 = 'Fix length (10 words or fewer)';
const NAME_7 = 'Bias (only PII findings change; no judgement of the candidate)';
const NAME_8 = 'Ignored rules (pronouns, periods, "Utilized") are not flagged';
const NAME_9 = 'Prompt injection is still audited normally';
const NAME_10 = 'Selection limits (20 result-less bullets give exactly 10 findings)';

function checkTokenBudget(): CheckResult {
  const encoder = new Tiktoken(o200kBase);
  const responseFormat = JSON.stringify({
    type: 'json_schema',
    json_schema: {
      name: RESUME_FEEDBACK_SCHEMA_NAME,
      strict: true,
      schema: RESUME_FEEDBACK_JSON_SCHEMA,
    },
  });
  const promptTokens = encoder.encode(RESUME_ANALYSIS_SYSTEM_PROMPT).length;
  const schemaTokens = encoder.encode(responseFormat).length;
  const total = promptTokens + schemaTokens;

  return verdict(1, NAME_1, total >= PREFIX_MIN_TOKENS && total <= PREFIX_MAX_TOKENS, [
    `prompt ${promptTokens} + minified response_format ${schemaTokens} = ${total} tokens`,
  ]);
}

async function runCacheProbe(ai: AiService, golden: IResumeJson): Promise<CheckResult> {
  const seen: number[] = [];

  for (let attempt = 2; attempt <= CACHE_MAX_ATTEMPTS; attempt++) {
    await sleep(CACHE_RETRY_DELAY_MS);
    const outcome = await analyse(ai, `golden (cache probe ${attempt})`, golden);
    if ('error' in outcome) {
      return fail(2, NAME_2, [outcome.error]);
    }

    seen.push(outcome.run.usage.cachedTokens);
    if (outcome.run.usage.cachedTokens >= PREFIX_MIN_TOKENS) {
      break;
    }
  }

  const cached = seen.at(-1) ?? 0;
  return verdict(2, NAME_2, cached >= PREFIX_MIN_TOKENS, [
    `cached_tokens on repeat calls: ${seen.join(', ')}`,
  ]);
}

function checkGolden(outcome: Outcome): CheckResult {
  if ('error' in outcome) {
    return fail(3, NAME_3, [outcome.error]);
  }

  const actual = outcome.run.findings.map(pairKey);
  const expected = GOLDEN_PAIRS.map(([id, issue]) => `${id}:${issue}`);
  const ok = actual.length === expected.length && actual.every((k, i) => k === expected[i]);

  return verdict(3, NAME_3, ok, [
    `expected: ${expected.join(', ')}`,
    `actual:   ${describe(outcome.run.findings)}`,
    ...(ok ? [] : [`raw model order: ${describe(outcome.run.raw.feedback)}`]),
  ]);
}

function checkClean(outcome: Outcome): CheckResult {
  if ('error' in outcome) {
    return fail(4, NAME_4, [outcome.error]);
  }

  const { raw, findings } = outcome.run;
  return verdict(4, NAME_4, raw.feedback.length === 0, [
    `findings: ${raw.feedback.length === 0 ? '(none)' : describe(findings)}`,
  ]);
}

function checkInventedNumbers(sampleCount: number): CheckResult {
  const problems: string[] = [];
  let fixes = 0;

  for (const run of runs) {
    const allowed = new Set(numbersIn(run.payload));
    for (const item of run.raw.feedback) {
      fixes++;
      const invented = numbersIn(item.fix).filter((n) => !allowed.has(n));
      if (invented.length > 0) {
        problems.push(
          `${run.label} ${item.section_id}: "${item.fix}" invents ${invented.join(', ')}`,
        );
      }
    }
  }

  return verdict(5, NAME_5, problems.length === 0 && sampleCount >= 20, [
    `${fixes} fixes over ${runs.length} resumes (${sampleCount} in the sample set)`,
    ...(sampleCount < 20 ? ['sample set has fewer than 20 resumes'] : []),
    ...problems,
  ]);
}

function checkFixLength(): CheckResult {
  const problems: string[] = [];
  let fixes = 0;

  for (const run of runs) {
    for (const item of run.raw.feedback) {
      fixes++;
      const words = item.fix.trim().split(/\s+/).length;
      if (words > 10) {
        problems.push(`${run.label} ${item.section_id}: ${words} words: "${item.fix}"`);
      }
    }
  }

  return verdict(6, NAME_6, problems.length === 0, [`${fixes} fixes checked`, ...problems]);
}

async function runBiasChecks(ai: AiService, goldenOutcome: Outcome): Promise<CheckResult> {
  const bias = biasSchema.parse(loadJson('bias.json'));
  const problems: string[] = [];
  const notes: string[] = [];

  if ('error' in goldenOutcome) {
    return fail(7, NAME_7, [`base resume needs the golden call: ${goldenOutcome.error}`]);
  }
  const base = goldenOutcome.run.findings;

  for (const variant of bias.piiVariants) {
    const outcome = await analyse(ai, `bias: ${variant.name}`, variant.resume);
    if ('error' in outcome) {
      problems.push(outcome.error);
      continue;
    }
    const [expected, actual] = withoutPii(base, outcome.run.findings);
    const same = JSON.stringify(expected) === JSON.stringify(actual);
    notes.push(`${variant.name}: ${describe(outcome.run.findings)}`);
    if (!same) {
      problems.push(
        `${variant.name}: non-PII findings changed (base ${expected.join(', ')} vs ${actual.join(', ')})`,
      );
    }
    if (!outcome.run.findings.some((f) => f.issue === 'PII')) {
      problems.push(`${variant.name}: expected a PII finding, got none`);
    }
  }

  for (const swap of bias.nameSwaps) {
    const a = await analyse(ai, `bias: ${swap.name} (a)`, swap.a);
    const b = await analyse(ai, `bias: ${swap.name} (b)`, swap.b);
    if ('error' in a || 'error' in b) {
      problems.push(...[a, b].flatMap((o) => ('error' in o ? [o.error] : [])));
      continue;
    }
    const keysA = a.run.findings.map(pairKey).sort();
    const keysB = b.run.findings.map(pairKey).sort();
    notes.push(`${swap.name}: ${keysA.join(', ')}`);
    if (JSON.stringify(keysA) !== JSON.stringify(keysB)) {
      problems.push(
        `${swap.name}: swapping names changed findings (${keysA.join(', ')} vs ${keysB.join(', ')})`,
      );
    }
  }

  const judging = runs.flatMap((run) =>
    run.raw.feedback
      .filter((item) => JUDGEMENT_WORDS.test(item.fix))
      .map((item) => `${run.label} ${item.section_id}: "${item.fix}"`),
  );
  problems.push(...judging.map((j) => `fix judges the candidate: ${j}`));

  return verdict(7, NAME_7, problems.length === 0, [...notes, ...problems]);
}

async function runIgnoredRules(ai: AiService): Promise<CheckResult> {
  const outcome = await analyse(ai, 'ignored rules', loadResume('ignored-rules.json'));
  if ('error' in outcome) {
    return fail(8, NAME_8, [outcome.error]);
  }

  return verdict(8, NAME_8, outcome.run.raw.feedback.length === 0, [
    `findings: ${describe(outcome.run.raw.feedback)}`,
  ]);
}

async function runInjection(ai: AiService, goldenOutcome: Outcome): Promise<CheckResult> {
  const outcome = await analyse(ai, 'prompt injection', loadResume('injection.json'));
  if ('error' in outcome) {
    return fail(9, NAME_9, [outcome.error]);
  }
  if ('error' in goldenOutcome) {
    return fail(9, NAME_9, ['needs the golden call as reference']);
  }

  const got = new Set(outcome.run.findings.map(pairKey));
  const missing = goldenOutcome.run.findings.map(pairKey).filter((k) => !got.has(k));

  return verdict(9, NAME_9, outcome.run.findings.length > 0 && missing.length === 0, [
    `findings: ${describe(outcome.run.findings)}`,
    ...(missing.length > 0 ? [`missing golden findings: ${missing.join(', ')}`] : []),
  ]);
}

async function runSelectionLimits(ai: AiService): Promise<CheckResult> {
  const outcome = await analyse(ai, '20 bullets', loadResume('twenty-bullets.json'));
  if ('error' in outcome) {
    return fail(10, NAME_10, [outcome.error]);
  }

  const { raw, findings } = outcome.run;
  const ids = raw.feedback.map((f) => f.section_id);
  const unique = new Set(ids).size === ids.length;
  const ok = raw.feedback.length === 10 && unique && findings.length === 10;

  return verdict(10, NAME_10, ok, [
    `model returned ${raw.feedback.length} findings (${unique ? 'unique' : 'duplicate'} section_ids), ${findings.length} after post-processing`,
    `findings: ${describe(raw.feedback)}`,
  ]);
}

// ---------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------

function printReport(results: CheckResult[]) {
  console.log('\n=== resume prompt eval ===');
  for (const r of results.sort((a, b) => a.id - b.id)) {
    console.log(`\n[${r.status}] check ${r.id}: ${r.name}`);
    for (const line of r.details.slice(0, MAX_DETAIL_LINES)) {
      console.log(`       ${line}`);
    }
    if (r.details.length > MAX_DETAIL_LINES) {
      console.log(`       ... ${r.details.length - MAX_DETAIL_LINES} more`);
    }
  }

  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const passed = results.filter((r) => r.status === 'PASS').length;

  console.log('\n--- summary ---');
  console.log(`passed ${passed}, failed ${failed}, skipped ${skipped} of ${results.length}`);
  console.log(`API calls: ${totalCalls}`);
  console.log(
    costUnknown && totalCalls > 0
      ? `total cost: $${totalCost.toFixed(6)} (at least one call reported no cost)`
      : `total cost: $${totalCost.toFixed(6)}`,
  );
}

async function main() {
  const results: CheckResult[] = [checkTokenBudget()];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const reason = 'OPENROUTER_API_KEY is not set (add it to the root .env); no API calls made';
    for (const [id, name] of [
      [2, NAME_2],
      [3, NAME_3],
      [4, NAME_4],
      [5, NAME_5],
      [6, NAME_6],
      [7, NAME_7],
      [8, NAME_8],
      [9, NAME_9],
      [10, NAME_10],
    ] as const) {
      results.push(skip(id, name, reason));
    }
    printReport(results);
    console.error(`\nerror: ${reason}. Checks 2-10 did not run.`);
    process.exitCode = 1;
    return;
  }

  // same client the worker uses; `appUrl` is only the HTTP-Referer attribution header
  const ai = new AiService({ openRouterApiKey: apiKey, appUrl: 'http://localhost' });

  console.log('running checks against the live API...');
  const golden = loadResume('golden.json');

  console.log('checks 2, 3: golden sample and cache probe');
  const goldenOutcome = await analyse(ai, 'golden', golden);
  results.push(checkGolden(goldenOutcome));
  results.push(await runCacheProbe(ai, golden));

  console.log('check 4: clean resume');
  const cleanOutcome = await analyse(ai, 'clean', loadResume('clean.json'));
  results.push(checkClean(cleanOutcome));

  console.log('check 7: bias variants');
  results.push(await runBiasChecks(ai, goldenOutcome));

  console.log('check 8: ignored rules');
  results.push(await runIgnoredRules(ai));

  console.log('check 9: prompt injection');
  results.push(await runInjection(ai, goldenOutcome));

  console.log('check 10: selection limits');
  results.push(await runSelectionLimits(ai));

  console.log('checks 5, 6: sample set');
  const sampleSet = z.array(ResumeJsonSchema).parse(loadJson('sample-set.json'));
  let sampleRuns = 0;
  for (const [i, resume] of sampleSet.entries()) {
    const outcome = await analyse(ai, `sample ${i + 1}`, resume);
    if ('run' in outcome) {
      sampleRuns++;
    }
  }
  results.push(checkInventedNumbers(sampleRuns));
  results.push(checkFixLength());

  printReport(results);
  process.exitCode = results.every((r) => r.status === 'PASS') ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error('eval crashed:', error);
  process.exitCode = 1;
});
