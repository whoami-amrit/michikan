/*
  Warnings:

  - The values [NOT_SHORTLISTED] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('NOT_APPLIED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_ONGOING', 'REJECTED', 'ACCEPTED');
ALTER TABLE "public"."Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'NOT_APPLIED';
COMMIT;

-- CreateTable
CREATE TABLE "VerifyOtp" (
    "otp" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "VerifyOtp_pkey" PRIMARY KEY ("otp","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerifyOtp_userId_key" ON "VerifyOtp"("userId");

-- AddForeignKey
ALTER TABLE "VerifyOtp" ADD CONSTRAINT "VerifyOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
