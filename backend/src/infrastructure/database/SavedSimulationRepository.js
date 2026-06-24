const prisma = require('./PrismaClient');

class SavedSimulationRepository {
  async saveSimulation(simulation) {
    const finalNetworkId = simulation.networkId || 'default-network';
    await prisma.network.upsert({
      where: { id: finalNetworkId },
      update: {},
      create: {
        id: finalNetworkId,
        name: `Network ${finalNetworkId.substring(0, 8)}`,
        browserId: finalNetworkId
      }
    });
    return prisma.savedSimulation.create({
      data: {
        simulationId: simulation.simulationId,
        tick: simulation.tick,
        throughput: simulation.throughput,
        latency: simulation.latency,
        packetLoss: simulation.packetLoss,
        congestion: simulation.congestion,
        totalPackets: simulation.totalPackets,
        deliveredPackets: simulation.deliveredPackets,
        droppedPackets: simulation.droppedPackets,
        healthScore: simulation.healthScore,
        healthStatus: simulation.healthStatus,
        details: simulation.details,
        networkId: finalNetworkId
      }
    });
  }

  async getSimulations(networkId = 'default-network') {
    return prisma.savedSimulation.findMany({
      where: { networkId },
      orderBy: { tick: 'asc' }
    });
  }

  async getLatestSimulation(networkId = 'default-network') {
    return prisma.savedSimulation.findFirst({
      where: { networkId },
      orderBy: { tick: 'desc' }
    });
  }

  async clear(networkId) {
    if (networkId) {
      return prisma.savedSimulation.deleteMany({
        where: { networkId }
      });
    }
    return prisma.savedSimulation.deleteMany();
  }

  // Backward compatibility aliases
  async saveSnapshot(simulation) {
    return this.saveSimulation(simulation);
  }

  async save(simulation) {
    return this.saveSimulation(simulation);
  }

  async getAll() {
    return this.getSimulations();
  }

  async getLatest() {
    return this.getLatestSimulation();
  }
}

module.exports = new SavedSimulationRepository();
