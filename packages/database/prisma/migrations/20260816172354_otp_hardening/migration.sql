/*
  Warnings:

  - The primary key for the `VerifyOtp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `otp` on the `VerifyOtp` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `VerifyOtp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `otpHash` to the `VerifyOtp` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "VerifyOtp_userId_key";

-- AlterTable
ALTER TABLE "VerifyOtp" DROP CONSTRAINT "VerifyOtp_pkey",
DROP COLUMN "otp",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "firstAttemptAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" TEXT NOT NULL,
ADD CONSTRAINT "VerifyOtp_pkey" PRIMARY KEY ("userId");
