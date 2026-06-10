import z from 'zod';

// Contact Information Schema
const ContactSchema = z.object({
  email: z.email('Invalid email address'),
  github: z.url('Invalid GitHub URL').optional(),
  linkedin: z.url('Invalid LinkedIn URL').optional(),
  portfolio: z
    .object({
      url: z.url('Invalid portfolio URL'),
      label: z.string(),
    })
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{10,}$/, 'Invalid phone number')
    .optional(),
});

// Skills organized by category
const SkillsSchema = z.record(z.string(), z.array(z.string()));

// Experience entry
const ExperienceEntrySchema = z
  .object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company name is required'),
    location: z.string().optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
    endDate: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), 'Invalid end date')
      .optional(),
    isCurrentRole: z.boolean().default(false),
    description: z.string().optional(),
    highlights: z.array(z.string()).min(1, 'At least one highlight is required'),
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

// Project/Open Source entry
const ProjectEntrySchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  description: z.string().optional(),
  url: z.url(`Invalid project URL`).optional(),
  highlights: z.array(z.string()).min(1, 'At least one highlight is required'),
  technologies: z.array(z.string()).optional(),
});

// Education entry
const EducationEntrySchema = z.object({
  institution: z.string().min(1, 'Institution name is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().optional(),
  graduationDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid graduation date'),
});

// Complete Resume Schema
const schema = z.object({
  personalInfo: z.object({
    name: z.string().min(1, 'Name is required'),
    summary: z.string().optional(),
    contact: ContactSchema,
  }),
  skills: SkillsSchema.optional(),
  experience: z.array(ExperienceEntrySchema).optional(),
  projects: z.array(ProjectEntrySchema).optional(),
  education: z.array(EducationEntrySchema).optional(),
});

export type IResumeJson = z.infer<typeof schema>;

export default schema;
