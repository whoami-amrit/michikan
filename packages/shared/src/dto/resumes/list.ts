import { z } from 'zod';

import { SortOrderSchema } from '../../common.zod';

export const RESUME_SORT_FIELDS = ['name', 'jobs', 'lastInteraction'] as const;

export const ResumeSortBySchema = z.enum(RESUME_SORT_FIELDS);

const schema = z.object({
  sortBy: ResumeSortBySchema.default('lastInteraction'),
  order: SortOrderSchema.default('desc'),
});

export type ResumeSortByType = z.infer<typeof ResumeSortBySchema>;
export type IListResumesQueryDto = z.infer<typeof schema>;
export type IListResumesQueryDtoInput = z.input<typeof schema>;

export default schema;
