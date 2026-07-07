/*
  Warnings:

  - Added the required column `preferredWorkSetting` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salaryExpectation` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearsOfExperience` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "text" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredWorkSetting" "WorkSetting" NOT NULL,
ADD COLUMN     "salaryExpectation" TEXT NOT NULL,
ADD COLUMN     "yearsOfExperience" TEXT NOT NULL;
