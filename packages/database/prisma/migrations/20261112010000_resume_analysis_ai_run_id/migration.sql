ALTER TABLE "Resume" ADD COLUMN "analysisAiRunId" INTEGER;

UPDATE "Resume" r
SET "analysisAiRunId" = latest."id"
FROM (
    SELECT DISTINCT ON ("resumeId") "resumeId", "id"
    FROM "AiRun"
    WHERE "status" = 'RESERVED' AND "resumeId" IS NOT NULL
    ORDER BY "resumeId", "id" DESC
) latest
WHERE r."id" = latest."resumeId";
