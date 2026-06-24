const prisma = require('./PrismaClient');

class RouterRepository {
  async save(router, networkId) {
    const finalNetworkId = router.networkId || networkId || 'default-network';
    await prisma.network.upsert({
      where: { id: finalNetworkId },
      update: {},
      create: {
        id: finalNetworkId,
        name: `Network ${finalNetworkId.substring(0, 8)}`,
        browserId: finalNetworkId
      }
    });
    return prisma.router.upsert({
      where: { id: router.id },
      update: { capacity: router.capacity, processingRate: router.processingRate, networkId: finalNetworkId },
      create: { id: router.id, capacity: router.capacity, processingRate: router.processingRate || 1, networkId: finalNetworkId }
    });
  }

  async getAll(networkId = 'default-network') {
    return prisma.router.findMany({
      where: { networkId },
      orderBy: { id: 'asc' }
    });
  }

  async getById(id, networkId = 'default-network') {
    return prisma.router.findFirst({
      where: { id, networkId }
    });
  }

  async delete(id, networkId = 'default-network') {
    return prisma.router.deleteMany({
      where: {
        id,
        networkId
      }
    });
  }

  async clear(networkId) {
    if (networkId) {
      return prisma.router.deleteMany({
        where: { networkId }
      });
    }
    return prisma.router.deleteMany();
  }
}

module.exports = new RouterRepository();
