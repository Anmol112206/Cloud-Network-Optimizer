-- CreateTable
CREATE TABLE "CongestionEvent" (
    "id" SERIAL NOT NULL,
    "simulationId" TEXT,
    "tick" INTEGER NOT NULL,
    "routerId" TEXT NOT NULL,
    "utilization" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CongestionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleneckEvent" (
    "id" SERIAL NOT NULL,
    "simulationId" TEXT,
    "tick" INTEGER NOT NULL,
    "linkId" TEXT NOT NULL,
    "utilization" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BottleneckEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CongestionEvent_simulationId_idx" ON "CongestionEvent"("simulationId");

-- CreateIndex
CREATE INDEX "CongestionEvent_tick_idx" ON "CongestionEvent"("tick");

-- CreateIndex
CREATE INDEX "CongestionEvent_routerId_idx" ON "CongestionEvent"("routerId");

-- CreateIndex
CREATE INDEX "BottleneckEvent_simulationId_idx" ON "BottleneckEvent"("simulationId");

-- CreateIndex
CREATE INDEX "BottleneckEvent_tick_idx" ON "BottleneckEvent"("tick");

-- CreateIndex
CREATE INDEX "BottleneckEvent_linkId_idx" ON "BottleneckEvent"("linkId");
