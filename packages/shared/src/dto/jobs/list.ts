import { z } from 'zod';

import { SortOrderSchema } from '../../common.zod';

export const JOB_SORT_FIELDS = ['name', 'status', 'updatedAt'] as const;

export const JobSortBySchema = z.enum(JOB_SORT_FIELDS);

const schema = z.object({
  sortBy: JobSortBySchema.default('updatedAt'),
  order: SortOrderSchema.default('desc'),
});

export type JobSortByType = z.infer<typeof JobSortBySchema>;
export type IListJobsQueryDto = z.infer<typeof schema>;
export type IListJobsQueryDtoInput = z.input<typeof schema>;

export default schema;
