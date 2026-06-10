import z from 'zod';

const schema = z.object({
  jobDescription: z.string().nonempty().max(10000),
  resumeId: z.number().nonnegative(),
});

export type ICreateJobApplicationDto = z.infer<typeof schema>;

export default schema;
