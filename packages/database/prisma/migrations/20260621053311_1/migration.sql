/*
  Warnings:

  - You are about to drop the `AnalysisJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResumeRenderJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AnalysisJob" DROP CONSTRAINT "AnalysisJob_jobId_fkey";

-- DropForeignKey
ALTER TABLE "ResumeRenderJob" DROP CONSTRAINT "ResumeRenderJob_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "ResumeRenderJob" DROP CONSTRAINT "ResumeRenderJob_userId_fkey";

-- DropTable
DROP TABLE "AnalysisJob";

-- DropTable
DROP TABLE "ResumeRenderJob";

-- CreateTable
CREATE TABLE "ResumeRenderWorker" (
    "id" SERIAL NOT NULL,
    "resumeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "WorkerStatus" NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "storageKey" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeRenderWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisWorker" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisWorker_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ResumeRenderWorker" ADD CONSTRAINT "ResumeRenderWorker_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeRenderWorker" ADD CONSTRAINT "ResumeRenderWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisWorker" ADD CONSTRAINT "AnalysisWorker_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
