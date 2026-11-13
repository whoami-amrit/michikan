ALTER TABLE "Resume" ADD COLUMN "jsonUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Resume" SET "analysisReport" = NULL;

UPDATE "Resume" SET "analysisStatus" = 'IDLE', "analysisError" = NULL;
