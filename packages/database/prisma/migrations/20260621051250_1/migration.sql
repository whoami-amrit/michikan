/*
  Warnings:

  - You are about to drop the column `jobApplicationId` on the `AnalysisJob` table. All the data in the column will be lost.
  - Added the required column `jobId` to the `AnalysisJob` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AnalysisJob" DROP CONSTRAINT "AnalysisJob_jobApplicationId_fkey";

-- AlterTable
ALTER TABLE "AnalysisJob" DROP COLUMN "jobApplicationId",
ADD COLUMN     "jobId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
