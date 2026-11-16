-- DESTRUCTIVE: removes job-fit analysis history and job at-a-glance summaries.
-- Take a Supabase backup before applying in production.

-- DropForeignKey
ALTER TABLE "JobFitAnalysis" DROP CONSTRAINT "JobFitAnalysis_userId_fkey";

-- DropForeignKey
ALTER TABLE "JobFitAnalysis" DROP CONSTRAINT "JobFitAnalysis_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "JobFitAnalysis" DROP CONSTRAINT "JobFitAnalysis_jobId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "atAGlance",
DROP COLUMN "atAGlanceGenerateStatus";

-- DropTable
DROP TABLE "JobFitAnalysis";
