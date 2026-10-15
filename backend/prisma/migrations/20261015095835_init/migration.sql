-- CreateEnum
CREATE TYPE "ChairType" AS ENUM ('AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('PDF', 'MANUAL');

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "ticketNo" TEXT,
    "trainName" TEXT NOT NULL,
    "trainNumber" TEXT,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "journeyDate" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT,
    "durationMins" INTEGER,
    "dayNight" TEXT NOT NULL DEFAULT 'DAY',
    "chairType" "ChairType" NOT NULL DEFAULT 'OTHER',
    "coachNo" TEXT,
    "seatNo" TEXT,
    "fare" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "passengerName" TEXT,
    "boardingPoint" TEXT,
    "issuedAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "source" "Source" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Journey_ticketNo_key" ON "Journey"("ticketNo");

-- CreateIndex
CREATE INDEX "Journey_journeyDate_idx" ON "Journey"("journeyDate");

-- CreateIndex
CREATE INDEX "Journey_fromStation_idx" ON "Journey"("fromStation");

-- CreateIndex
CREATE INDEX "Journey_toStation_idx" ON "Journey"("toStation");

-- CreateIndex
CREATE INDEX "Journey_trainName_idx" ON "Journey"("trainName");

-- CreateIndex
CREATE INDEX "Journey_chairType_idx" ON "Journey"("chairType");

-- CreateIndex
CREATE INDEX "Journey_dayNight_idx" ON "Journey"("dayNight");
