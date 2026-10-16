/*
  Warnings:

  - You are about to drop the column `arrivalTime` on the `Journey` table. All the data in the column will be lost.
  - You are about to drop the column `durationMins` on the `Journey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Journey" DROP COLUMN "arrivalTime",
DROP COLUMN "durationMins";
