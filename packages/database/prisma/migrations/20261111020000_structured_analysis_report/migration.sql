-- Old markdown reports are discarded (no migration of old reports).
UPDATE "Resume" SET "analysisReport" = NULL;

-- AlterTable
ALTER TABLE "Resume" ALTER COLUMN "analysisReport" TYPE JSONB USING NULL;

-- Every resume has to be analysed again
UPDATE "Resume" SET "analysisStatus" = 'IDLE';
