import { z } from 'zod';

const schema = z.object({
  autoAnalyseResume: z.boolean(),
});

export type IUpdatePreferencesDto = z.infer<typeof schema>;

export default schema;
