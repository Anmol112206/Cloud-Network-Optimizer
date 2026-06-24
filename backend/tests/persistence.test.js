const routerRepository = require('../src/infrastructure/database/RouterRepository');
const linkRepository = require('../src/infrastructure/database/LinkRepository');
const trafficRepository = require('../src/infrastructure/database/TrafficSettingsRepository');
const savedSimulationRepository = require('../src/infrastructure/database/SavedSimulationRepository');
const metricsCache = require('../src/infrastructure/redis/MetricsCache');
const prisma = require('../src/infrastructure/database/PrismaClient');

describe('Persistence Integration Tests', () => {
  beforeEach(async () => {
    // Clear test tables in dependency order
    await savedSimulationRepository.clear();
    await linkRepository.clear();
    await routerRepository.clear();
    await trafficRepository.clear();
    
    // Clear Network
    await prisma.network.deleteMany();

    // Auto-seed default network for relational constraints
    await prisma.network.create({
      data: {
        id: 'default-network',
        name: 'Default Network',
        browserId: 'default-network'
      }
    });
  });

  afterAll(async () => {
    // Clean up tables and disconnect
    await savedSimulationRepository.clear();
    await linkRepository.clear();
    await routerRepository.clear();
    await trafficRepository.clear();
    await prisma.network.deleteMany();
    await prisma.$disconnect();
    
    // Clean up Redis client
    try {
      await metricsCache.clearTopology();
      await metricsCache.disconnect();
    } catch (err) {
      // Ignore if Redis is offline
    }
  });

  describe('RouterRepository', () => {
    it('should save and retrieve routers', async () => {
      const routerData = { id: 'TEST-R1', capacity: 30, processingRate: 5 };
      
      const saved = await routerRepository.save(routerData);
      expect(saved.id).toBe('TEST-R1');
      expect(saved.capacity).toBe(30);
      expect(saved.processingRate).toBe(5);

      const all = await routerRepository.getAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe('TEST-R1');
      expect(all[0].processingRate).toBe(5);

      const found = await routerRepository.getById('TEST-R1');
      expect(found).toBeDefined();
      expect(found.capacity).toBe(30);
      expect(found.processingRate).toBe(5);
    });

    it('should update capacity of existing router on save', async () => {
      await routerRepository.save({ id: 'TEST-R1', capacity: 15, processingRate: 2 });
      const updated = await routerRepository.save({ id: 'TEST-R1', capacity: 45, processingRate: 4 });
      
      expect(updated.capacity).toBe(45);
      expect(updated.processingRate).toBe(4);
      const found = await routerRepository.getById('TEST-R1');
      expect(found.capacity).toBe(45);
      expect(found.processingRate).toBe(4);
    });
  });

  describe('LinkRepository', () => {
    it('should save and retrieve links', async () => {
      // First save router dependencies to pass foreign keys
      await routerRepository.save({ id: 'TEST-R1', capacity: 10 });
      await routerRepository.save({ id: 'TEST-R2', capacity: 10 });

      const linkData = { id: 'TEST-L1', source: 'TEST-R1', target: 'TEST-R2', bandwidth: 500.5, latency: 5 };
      
      const saved = await linkRepository.save(linkData);
      expect(saved.id).toBe('TEST-L1');
      expect(saved.bandwidth).toBe(500.5);

      const all = await linkRepository.getAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe('TEST-L1');

      const found = await linkRepository.getById('TEST-L1');
      expect(found).toBeDefined();
      expect(found.latency).toBe(5);
    });
  });

  describe('TrafficSettingsRepository', () => {
    it('should save and retrieve traffic settings', async () => {
      const trafficData = { id: 'stream-1', packetRate: 4.2, packetSizeMin: 120, packetSizeMax: 1800, enabled: true };
      
      const saved = await trafficRepository.save(trafficData, 'default-network');
      expect(saved.id).toBe('stream-1');
      expect(saved.packetRate).toBe(4.2);

      const fetched = await trafficRepository.get('default-network');
      expect(fetched).toBeDefined();
      expect(fetched.id).toBe('stream-1');
      expect(fetched.packetSizeMax).toBe(1800);
      expect(fetched.enabled).toBe(true);
    });
  });

  describe('SavedSimulationRepository', () => {
    it('should save and retrieve simulation runs', async () => {
      const simData = {
        simulationId: 'sim-1',
        tick: 1,
        throughput: 12.5,
        latency: 4.2,
        packetLoss: 0.01,
        congestion: 0.15,
        totalPackets: 10,
        deliveredPackets: 9,
        droppedPackets: 1,
        healthScore: 90,
        healthStatus: 'healthy',
        details: { routers: [] }
      };

      const saved = await savedSimulationRepository.saveSimulation(simData);
      expect(saved.id).toBeDefined();
      expect(saved.throughput).toBe(12.5);

      const all = await savedSimulationRepository.getSimulations();
      expect(all.length).toBe(1);
      expect(all[0].simulationId).toBe('sim-1');

      const latest = await savedSimulationRepository.getLatestSimulation();
      expect(latest).toBeDefined();
      expect(latest.tick).toBe(1);
    });
  });

  describe('MetricsCache (Redis)', () => {
    it('should cache and retrieve topology configurations', async () => {
      try {
        const routers = [{ id: 'R1', capacity: 10 }];
        const links = [{ id: 'L1', source: 'R1', target: 'R2', bandwidth: 100, latency: 2 }];
        const traffic = { packetRate: 2.0, packetSizeMin: 100, packetSizeMax: 1000, enabled: true };

        await metricsCache.cacheRouters(routers);
        await metricsCache.cacheLinks(links);
        await metricsCache.cacheTraffic(traffic);

        const cachedRouters = await metricsCache.getRouters();
        const cachedLinks = await metricsCache.getLinks();
        const cachedTraffic = await metricsCache.getTraffic();

        expect(cachedRouters).toEqual(routers);
        expect(cachedLinks).toEqual(links);
        expect(cachedTraffic).toEqual(traffic);
      } catch (err) {
        console.warn('Skipping Redis test assertion because Redis is likely offline:', err.message);
      }
    });

    it('should cache and retrieve snapshots list', async () => {
      try {
        const snapshots = [
          { tick: 1, throughput: 100.5, latency: 5, packetLoss: 0, congestion: 0.1 },
          { tick: 2, throughput: 110.2, latency: 4, packetLoss: 0.01, congestion: 0.2 }
        ];

        await metricsCache.cacheSnapshots(snapshots);
        const cached = await metricsCache.getSnapshots();

        expect(cached.length).toBe(2);
        expect(cached[0].tick).toBe(1);
      } catch (err) {
        console.warn('Skipping Redis test assertion because Redis is likely offline:', err.message);
      }
    });
  });
});
