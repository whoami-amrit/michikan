ALTER TABLE "Job" ADD COLUMN "submittedResumeLinkedAt" TIMESTAMP(3);

UPDATE "Job" SET "submittedResumeLinkedAt" = "createdAt" WHERE "submittedResumeId" IS NOT NULL;
