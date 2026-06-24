const prisma = require('./PrismaClient');

class TrafficSettingsRepository {
  async save(settings, networkId = 'default-network') {
    const id = networkId;
    return prisma.trafficSettings.upsert({
      where: { id },
      update: {
        packetRate: settings.packetRate,
        packetSizeMin: settings.packetSizeMin,
        packetSizeMax: settings.packetSizeMax,
        enabled: settings.enabled,
        source: settings.source,
        destination: settings.destination
      },
      create: {
        id,
        packetRate: settings.packetRate,
        packetSizeMin: settings.packetSizeMin,
        packetSizeMax: settings.packetSizeMax,
        enabled: settings.enabled,
        source: settings.source,
        destination: settings.destination
      }
    });
  }

  async get(networkId = 'default-network') {
    return prisma.trafficSettings.findUnique({
      where: { id: networkId }
    });
  }

  async clear(networkId) {
    if (networkId) {
      return prisma.trafficSettings.deleteMany({
        where: { id: networkId }
      });
    }
    return prisma.trafficSettings.deleteMany();
  }
}

module.exports = new TrafficSettingsRepository();
