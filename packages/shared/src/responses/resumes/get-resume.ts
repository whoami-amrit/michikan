import { Resume } from 'db';

import type { ResumeAnalysisSnapshot } from '../../analysis';

export type IGetResumeResponse = Omit<Resume, 'analysisReport'> & {
  analysisReport: ResumeAnalysisSnapshot | null;
};
