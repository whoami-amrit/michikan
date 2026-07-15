/*
  Warnings:

  - You are about to drop the column `activeResumeUserId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `noClutter` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preferredWorkSetting` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `salaryExpectation` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `yearsOfExperience` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "activeResumeUserId",
DROP COLUMN "avatar",
DROP COLUMN "noClutter",
DROP COLUMN "preferredWorkSetting",
DROP COLUMN "salaryExpectation",
DROP COLUMN "yearsOfExperience";
