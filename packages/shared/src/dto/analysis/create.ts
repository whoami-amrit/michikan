import z from 'zod';

const schema = z.object({
  jobDescription: z.string().nonempty('Job description must not be empty').max(10000),
  resumeId: z.number().nonnegative(),
});

export type ICreateAnalysisDto = z.infer<typeof schema>;
export type ICreateAnalysisDtoInput = z.input<typeof schema>;

export default schema;
