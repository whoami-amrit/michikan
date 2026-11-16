ALTER TABLE "AiRun" DROP CONSTRAINT "AiRun_resumeId_fkey";

DROP INDEX "AiRun_resumeId_status_idx";

ALTER TABLE "AiRun" DROP COLUMN "resumeId";
