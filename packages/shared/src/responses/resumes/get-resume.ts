import { Resume } from 'db';

import type { ResumeAnalysisSnapshot } from '../../analysis';

export interface IGetResumeResponse extends Omit<Resume, 'analysisReport'> {
  analysisReport: ResumeAnalysisSnapshot | null;
  isAnalysisStale: boolean;
}
