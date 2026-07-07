import z from 'zod';

const schema = z.object({
  jobTitle: z
    .string()
    .nonempty('Job title is required')
    .max(100, 'Job title must be less than 100 characters'),
  companyName: z
    .string()
    .nonempty('Company name is required')
    .max(100, 'Company name must be less than 100 characters'),
  workSetting: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']),
  experienceLevel: z.enum(['JUNIOR', 'MID', 'SENIOR', 'STAFF_PLUS', 'UNKNOWN']),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string().nullable(),
  salaryRangeDenomination: z.enum(['ANNUALLY', 'HOURLY']),
  requiredSkills: z
    .array(z.string().nonempty('Skill cannot be empty'))
    .max(50, 'Maximum 50 required skills'),
  preferredSkills: z
    .array(z.string().nonempty('Skill cannot be empty'))
    .max(50, 'Maximum 50 preferred skills'),
  matchedRequiredSkills: z
    .array(z.string().nonempty('Required skill cannot be empty'))
    .max(50, 'Maximum 50 matched required skills'),
  matchedPreferredSkills: z
    .array(z.string().nonempty('Preferred skill cannot be empty'))
    .max(50, 'Maximum 50 matched preferred skills'),
  missingRequiredSkills: z
    .array(z.string().nonempty('Missing required skill cannot be empty'))
    .max(50, 'Maximum 50 missing required skills'),
  missingPreferredSkills: z
    .array(z.string().nonempty('Missing preferred skill cannot be empty'))
    .max(50, 'Maximum 50 missing preferred skills'),
  matchScore: z
    .number()
    .nonnegative('Skill match score must be at least 0')
    .max(100, 'Skill match score can at most be 100'),
  summary: z.string().max(2000, 'Summary must be less than 2000 characters'),
});

export type IAnalysisReport = z.infer<typeof schema>;

export { schema as AnalysisReportSchema };
