import z from 'zod';

export const yearsOfExperienceSchema = z
  .string()
  .regex(
    /^[0-9]+ Year\(s\)( & ([1-9]|1[0-1]) Month\(s\))?$/,
    'Years of experience must be in the format of "X Year(s) & Y Month(s)" or "X Year(s)" or "0 Year(s) & Y Month(s)"',
  );

export const preferredWorkSettingSchema = z.enum(['REMOTE', 'HYBRID', 'ONSITE']);

export const salaryExpectationSchema = z
  .string()
  .regex(
    /^[0-9]+k?-([0-9]+k?|infinity) [A-Z]{3} Per (Annum|Hour)$/,
    'Salary expectation must be in the format of "min-max currency Per Annum/Hour", e.g. "50k-100k USD Per Annum" or "30-50 EUR Per Hour"',
  );
