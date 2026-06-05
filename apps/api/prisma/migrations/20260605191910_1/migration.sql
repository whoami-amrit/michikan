/*
  Warnings:

  - Added the required column `accountProvider` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "accountProvider" "Provider" NOT NULL;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountProvider_userId_fkey" FOREIGN KEY ("accountProvider", "userId") REFERENCES "Account"("provider", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
