-- CreateEnum
CREATE TYPE "ResumeAnalysisStatus" AS ENUM ('IDLE', 'QUEUED', 'GENERATING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ResumeAnalysisError" AS ENUM ('QUOTA_EXCEEDED', 'PROVIDER_UNAVAILABLE', 'INTERNAL');

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN "analysisStatus" "ResumeAnalysisStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN "analysisError" "ResumeAnalysisError";

-- Map existing rows. A GENERATING row has no job behind it, so it goes back to IDLE.
UPDATE "Resume"
SET "analysisStatus" = CASE "analysisReportGenerateStatus"::text
  WHEN 'DONE' THEN 'DONE'::"ResumeAnalysisStatus"
  WHEN 'FAILED' THEN 'FAILED'::"ResumeAnalysisStatus"
  ELSE 'IDLE'::"ResumeAnalysisStatus"
END;

-- AlterTable
ALTER TABLE "Resume" DROP COLUMN "analysisReportGenerateStatus";

-- DropEnum
DROP TYPE "ReportGenerationStatus";
