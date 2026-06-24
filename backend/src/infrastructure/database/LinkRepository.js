const prisma = require('./PrismaClient');

class LinkRepository {
  async save(link, networkId) {
    const finalNetworkId = link.networkId || networkId || 'default-network';
    await prisma.network.upsert({
      where: { id: finalNetworkId },
      update: {},
      create: {
        id: finalNetworkId,
        name: `Network ${finalNetworkId.substring(0, 8)}`,
        browserId: finalNetworkId
      }
    });
    return prisma.link.upsert({
      where: { id: link.id },
      update: {
        source: link.source,
        target: link.target,
        bandwidth: link.bandwidth,
        latency: link.latency,
        networkId: finalNetworkId
      },
      create: {
        id: link.id,
        source: link.source,
        target: link.target,
        bandwidth: link.bandwidth,
        latency: link.latency,
        networkId: finalNetworkId
      }
    });
  }

  async getAll(networkId = 'default-network') {
    return prisma.link.findMany({
      where: { networkId },
      orderBy: { id: 'asc' }
    });
  }

  async getById(id, networkId = 'default-network') {
    return prisma.link.findFirst({
      where: { id, networkId }
    });
  }

  async delete(id, networkId = 'default-network') {
    return prisma.link.deleteMany({
      where: { id, networkId }
    });
  }

  async clear(networkId) {
    if (networkId) {
      return prisma.link.deleteMany({
        where: { networkId }
      });
    }
    return prisma.link.deleteMany();
  }
}

module.exports = new LinkRepository();
