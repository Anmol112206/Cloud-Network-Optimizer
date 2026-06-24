-- CreateTable
CREATE TABLE "Snapshot" (
    "id" SERIAL NOT NULL,
    "simulationId" TEXT,
    "tick" INTEGER NOT NULL,
    "throughput" DOUBLE PRECISION NOT NULL,
    "latency" DOUBLE PRECISION NOT NULL,
    "packetLoss" DOUBLE PRECISION NOT NULL,
    "congestion" DOUBLE PRECISION NOT NULL,
    "totalPackets" INTEGER NOT NULL DEFAULT 0,
    "deliveredPackets" INTEGER NOT NULL DEFAULT 0,
    "droppedPackets" INTEGER NOT NULL DEFAULT 0,
    "healthScore" DOUBLE PRECISION,
    "healthStatus" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_simulationId_idx" ON "Snapshot"("simulationId");

-- CreateIndex
CREATE INDEX "Snapshot_tick_idx" ON "Snapshot"("tick");
