/*
  Warnings:

  - You are about to drop the column `resumeId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `saved` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the `AnalysisWorker` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AnalysisWorker" DROP CONSTRAINT "AnalysisWorker_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_resumeId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "resumeId",
DROP COLUMN "saved",
ADD COLUMN     "submittedResumeId" INTEGER;

-- DropTable
DROP TABLE "AnalysisWorker";

-- CreateTable
CREATE TABLE "Analysis" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "jobDescription" TEXT,
    "userId" INTEGER NOT NULL,
    "resumeId" INTEGER NOT NULL,
    "jobId" INTEGER,
    "status" "WorkerStatus" NOT NULL,
    "error" TEXT,
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_submittedResumeId_fkey" FOREIGN KEY ("submittedResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
