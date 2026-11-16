import { Resume } from 'db';

import type { IResumeAnalysisSnapshot } from '../../analysis';

export interface IGetResumeResponse extends Omit<Resume, 'analysisReport'> {
  analysisReport: IResumeAnalysisSnapshot | null;
  isAnalysisStale: boolean;
}
