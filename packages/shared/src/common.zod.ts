import z from 'zod';

export const resourceNameSchema = z
  .string()
  .min(1, 'Resume name is required')
  .max(50, 'Resume name must be less than 50 characters');
export const resourceDescriptionSchema = z
  .string()
  .max(200, 'Description must be less than 200 characters')
  .optional();

export const zodSafeString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}, z.string().trim().optional());

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(255, 'Name must be less than 255 characters');

export const emailSchema = z
  .email('Invalid email address')
  .max(100, 'Email must be less than 100 characters');

const PersonalInfoSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  github: zodSafeString.pipe(
    z.url('Invalid GitHub URL').max(500, 'GitHub URL must be less than 500 characters').optional(),
  ),
  linkedin: zodSafeString.pipe(
    z
      .url('Invalid LinkedIn URL')
      .max(500, 'LinkedIn URL must be less than 500 characters')
      .optional(),
  ),
  portfolio: z.preprocess(
    (value: Record<string, unknown>) => {
      if (typeof value !== 'object' || value === null) {
        return value;
      }

      if (value.url === '' && value.label === '') {
        return undefined;
      }

      return value;
    },
    z
      .object({
        url: z
          .url('Invalid portfolio URL')
          .max(500, 'Portfolio URL must be less than 500 characters'),
        label: z
          .string()
          .trim()
          .min(1, 'Label is required')
          .max(50, 'Label must be less than 50 characters'),
      })
      .optional(),
  ),
  phone: zodSafeString.pipe(
    z
      .string()
      .regex(/^\+?[\d\s\-()]{10,}$/, 'Invalid phone number')
      .max(20, 'Phone number must be less than 20 characters')
      .optional(),
  ),
});

const SkillEntrySchema = z.object({
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters'),
  skills: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'At least one skill is required')
        .max(100, 'Skill must be less than 100 characters'),
    )
    .max(20, 'Maximum 20 skills per category'),
});

const ExperienceEntrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Job title is required')
      .max(100, 'Job title must be less than 100 characters'),
    company: z
      .string()
      .trim()
      .min(1, 'Company name is required')
      .max(100, 'Company name must be less than 100 characters'),
    location: zodSafeString.pipe(
      z.string().max(100, 'Location must be less than 100 characters').optional(),
    ),
    startDate: z
      .string()
      .trim()
      .refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
    endDate: zodSafeString.pipe(
      z
        .string()
        .refine((date) => !isNaN(Date.parse(date)), 'Invalid end date')
        .optional(),
    ),
    isCurrentRole: z.boolean().default(false),
    description: zodSafeString.pipe(
      z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    ),
    highlights: z
      .array(z.string().trim().max(500, 'Highlight must be less than 500 characters'))
      .min(1, 'At least one highlight is required')
      .max(10, 'Maximum 10 highlights per experience'),
  })
  .superRefine((data, ctx) => {
    if (data.isCurrentRole && data.endDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be empty if this is the current role',
      });
    }

    if (!data.isCurrentRole && !data.endDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date is required if this is not the current role',
      });
    }
  });

const ProjectEntrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Project title is required')
    .max(100, 'Project title must be less than 100 characters'),
  description: zodSafeString.pipe(
    z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  ),
  url: zodSafeString.pipe(
    z
      .url('Invalid project URL')
      .max(500, 'Project URL must be less than 500 characters')
      .optional(),
  ),
  highlights: z
    .array(z.string().trim().max(500, 'Highlight must be less than 500 characters'))
    .min(1, 'At least one highlight is required')
    .max(10, 'Maximum 10 highlights per project'),
  technologies: z
    .array(z.string().trim().max(50, 'Technology name must be less than 50 characters'))
    .max(15, 'Maximum 15 technologies per project'),
});

const EducationEntrySchema = z.object({
  institution: z
    .string()
    .trim()
    .min(1, 'Institution name is required')
    .max(100, 'Institution name must be less than 100 characters'),
  degree: z
    .string()
    .trim()
    .min(1, 'Degree is required')
    .max(50, 'Degree must be less than 50 characters'),
  field: zodSafeString.pipe(z.string().max(50, 'Field must be less than 50 characters').optional()),
  graduationDate: z
    .string()
    .trim()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid graduation date'),
});

const schema = z.object({
  personalInfo: PersonalInfoSchema,
  skills: z.array(SkillEntrySchema).max(10, 'Maximum 10 skill categories').optional(),
  experience: z.array(ExperienceEntrySchema).max(20, 'Maximum 20 experience entries').optional(),
  projects: z.array(ProjectEntrySchema).max(20, 'Maximum 20 projects').optional(),
  education: z.array(EducationEntrySchema).max(10, 'Maximum 10 education entries').optional(),
  summary: zodSafeString.pipe(
    z.string().max(1000, 'Summary must be less than 1000 characters').optional(),
  ),
});

export { schema as ResumeJsonSchema };
