/*
  Warnings:

  - Added the required column `company` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "WorkSetting" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "applicationUrl" TEXT,
ADD COLUMN     "company" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "dateApplied" TIMESTAMP(3),
ADD COLUMN     "experienceLevel" "ExperienceLevel",
ADD COLUMN     "maxCompensation" INTEGER,
ADD COLUMN     "minCompensation" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "workSetting" "WorkSetting",
ALTER COLUMN "title" SET NOT NULL;
