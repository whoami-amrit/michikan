import { z } from 'zod';

import { AnalysisReportSchema } from '../common.zod';

export type IAnalysisReport = z.infer<typeof AnalysisReportSchema>;
