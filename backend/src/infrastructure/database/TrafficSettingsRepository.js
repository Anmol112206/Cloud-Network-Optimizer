const prisma = require('./PrismaClient');

class TrafficSettingsRepository {
  async save(settings, networkId = 'default-network') {
    const id = settings.id || `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.network.upsert({
      where: { id: networkId },
      update: {},
      create: {
        id: networkId,
        name: `Network ${networkId.substring(0, 8)}`,
        browserId: networkId
      }
    });
    return prisma.trafficSettings.upsert({
      where: { id },
      update: {
        packetRate: settings.packetRate,
        packetSizeMin: settings.packetSizeMin,
        packetSizeMax: settings.packetSizeMax,
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        source: settings.source,
        destination: settings.destination,
        networkId: networkId
      },
      create: {
        id,
        packetRate: settings.packetRate,
        packetSizeMin: settings.packetSizeMin,
        packetSizeMax: settings.packetSizeMax,
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        source: settings.source,
        destination: settings.destination,
        networkId: networkId
      }
    });
  }

  async getAll(networkId = 'default-network') {
    return prisma.trafficSettings.findMany({
      where: { networkId }
    });
  }

  // Preserve backward compatibility alias
  async get(networkId = 'default-network') {
    const list = await this.getAll(networkId);
    return list.length > 0 ? list[list.length - 1] : null;
  }

  async delete(id, networkId = 'default-network') {
    return prisma.trafficSettings.deleteMany({
      where: { id, networkId }
    });
  }

  async clear(networkId) {
    if (networkId) {
      return prisma.trafficSettings.deleteMany({
        where: { networkId }
      });
    }
    return prisma.trafficSettings.deleteMany();
  }
}

module.exports = new TrafficSettingsRepository();
