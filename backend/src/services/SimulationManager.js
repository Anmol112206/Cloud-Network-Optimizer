const Network = require('../simulator/Network');
const TopologyBuilder = require('../simulator/TopologyBuilder');
const RoutingService = require('./RoutingService');
const CongestionService = require('./CongestionService');
const MetricsService = require('./MetricsService');
const SnapshotService = require('./SnapshotService');
const SimulationClock = require('../simulation/SimulationClock');
const TrafficGenerator = require('../simulation/TrafficGenerator');
const PacketSimulator = require('../simulation/PacketSimulator');

const routerRepository = require('../infrastructure/database/RouterRepository');
const linkRepository = require('../infrastructure/database/LinkRepository');
const trafficRepository = require('../infrastructure/database/TrafficSettingsRepository');
const savedSimulationRepository = require('../infrastructure/database/SavedSimulationRepository');
const metricsCache = require('../infrastructure/redis/MetricsCache');
const prisma = require('../infrastructure/database/PrismaClient');
const Logger = require('../infrastructure/logger/Logger');

class SimulationManager {
  constructor() {
    this.contexts = new Map();
    this.logger = new Logger('SimulationManager');
    this.cleanupInterval = null;

    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => this.cleanupInactiveContexts(), 60000);
    }
  }

  async getOrCreateContext(networkId) {
    const finalId = networkId || 'default-network';

    let context = this.contexts.get(finalId);
    if (!context) {
      this.logger.info(`Creating new simulation context for networkId: ${finalId}`);
      context = await this.createContext(finalId);
      this.contexts.set(finalId, context);
    }

    context.lastAccessed = Date.now();
    return context;
  }

  createContextSync(networkId) {
    const network = new Network();
    const topology = new TopologyBuilder(network);
    const routingService = new RoutingService(network, topology);
    const congestionService = new CongestionService(network);
    const clock = new SimulationClock();
    const metricsService = new MetricsService(network, clock);

    const generator = new TrafficGenerator(network, clock, {
      enabled: false
    });
    const simulator = new PacketSimulator(network, clock, routingService, generator);

    const snapshotService = new SnapshotService(
      clock,
      metricsService,
      congestionService,
      savedSimulationRepository,
      metricsCache,
      { generator, networkId }
    );

    const context = {
      network,
      topology,
      routingService,
      congestionService,
      clock,
      metricsService,
      generator,
      simulator,
      snapshotService,
      networkId,
      lastAccessed: Date.now(),
      tickInterval: null
    };

    return context;
  }

  async createContext(networkId) {
    const context = this.createContextSync(networkId);

    // Ensure network exists in Postgres
    await this.ensureNetworkInDb(networkId);

    // Load topology and settings
    await this.loadTopologyAndSettings(context);

    // Start clock ticking in non-test env
    if (process.env.NODE_ENV !== 'test') {
      context.tickInterval = setInterval(() => {
        if (context.generator && context.generator.options.enabled) {
          context.clock.tick();
        }
      }, 2000);
    }

    return context;
  }

  async ensureNetworkInDb(networkId) {
    try {
      await prisma.network.upsert({
        where: { id: networkId },
        update: {},
        create: {
          id: networkId,
          name: `Network ${networkId.substring(0, 8)}`,
          browserId: networkId
        }
      });
    } catch (err) {
      this.logger.error(`Failed to ensure network ${networkId} in database:`, err);
    }
  }

  async loadTopologyAndSettings(context) {
    const { network, topology, generator, networkId } = context;
    try {
      // 1. Try to load from Redis cache first
      let routers = await metricsCache.getRouters(networkId);
      let links = await metricsCache.getLinks(networkId);
      let trafficStreams = await metricsCache.getTraffic(networkId);

      // 2. If missing, fetch from database and cache
      if (!routers || !links || !trafficStreams) {
        const dbRouters = await routerRepository.getAll(networkId);
        const dbLinks = await linkRepository.getAll(networkId);
        const dbTraffic = await trafficRepository.getAll(networkId);

        routers = dbRouters.map(r => ({ id: r.id, capacity: r.capacity, processingRate: r.processingRate }));
        links = dbLinks.map(l => ({ id: l.id, source: l.source, target: l.target, bandwidth: l.bandwidth, latency: l.latency }));
        trafficStreams = dbTraffic ? dbTraffic.map(t => ({
          id: t.id,
          packetRate: t.packetRate,
          packetSizeMin: t.packetSizeMin,
          packetSizeMax: t.packetSizeMax,
          enabled: t.enabled,
          source: t.source,
          destination: t.destination
        })) : [];

        // Cache back
        await metricsCache.cacheRouters(routers, networkId);
        await metricsCache.cacheLinks(links, networkId);
        await metricsCache.cacheTraffic(trafficStreams, networkId);
      }

      // 3. Populate network and topology
      for (const r of routers) {
        network.addRouter(r.id, r.capacity, r.processingRate);
      }
      for (const l of links) {
        network.addLink(l.id, l.source, l.target, l.bandwidth, l.latency);
        topology.addConnection(l.source, l.target, l.id);
      }

      // 4. Update generator streams
      if (generator) {
        generator.streams = trafficStreams || [];
      }

      if (context.routingService && typeof context.routingService.clearCache === 'function') {
        context.routingService.clearCache();
      }
    } catch (err) {
      this.logger.error(`Failed to load topology for ${networkId}:`, err);
    }
  }

  cleanupInactiveContexts() {
    const now = Date.now();
    const timeout = 15 * 60 * 1000; // 15 minutes inactive
    for (const [networkId, context] of this.contexts.entries()) {
      if (networkId === 'default-network') continue;

      if (now - context.lastAccessed > timeout) {
        this.logger.info(`Cleaning up inactive context for networkId: ${networkId}`);
        if (context.tickInterval) {
          clearInterval(context.tickInterval);
        }
        if (context.snapshotService && typeof context.snapshotService.cleanup === 'function') {
          context.snapshotService.cleanup();
        }
        this.contexts.delete(networkId);
      }
    }
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    for (const context of this.contexts.values()) {
      if (context.tickInterval) {
        clearInterval(context.tickInterval);
      }
      if (context.snapshotService && typeof context.snapshotService.cleanup === 'function') {
        context.snapshotService.cleanup();
      }
    }
    this.contexts.clear();
  }
}

module.exports = new SimulationManager();
