const savedSimulationRepositoryDefault = require('../infrastructure/database/SavedSimulationRepository');
const metricsCacheDefault = require('../infrastructure/redis/MetricsCache');

/**
 * Snapshot Service
 * Collects tick, metrics, congestion, and bottlenecks on each clock tick.
 * Saves permanently to PostgreSQL and caches the current state in Redis.
 */
class SnapshotService {
  constructor(clock, metricsService, congestionService, savedSimulationRepository = savedSimulationRepositoryDefault, metricsCache = metricsCacheDefault, options = {}) {
    this.clock = clock;
    this.metricsService = metricsService;
    this.congestionService = congestionService;
    this.snapshotRepository = savedSimulationRepository;
    this.metricsCache = metricsCache;
    this.networkId = options.networkId || 'default-network';
    this.simulationId = options.simulationId || null;
    this.generator = options.generator || null;
    this.pendingPromises = [];

    // Register with simulation clock if provided
    if (this.clock) {
      this.unsubscribe = this.clock.onTick((tick) => {
        const promise = this.handleTick(tick);
        this.pendingPromises.push(promise);
      });
    }
  }

  /**
   * Main tick handler: triggers calculations and saves current state to DB and Cache
   */
  async handleTick(tick) {
    try {
      // 1. Let CongestionService update its internal trend history
      if (this.congestionService && typeof this.congestionService.recordCongestionSnapshot === 'function') {
        this.congestionService.recordCongestionSnapshot();
      }

      // 2. Collect everything into one object
      const networkMetrics = this.metricsService.getNetworkMetrics();
      const networkCongestion = this.congestionService.getNetworkCongestion();
      const bottlenecks = this.congestionService.identifyBottlenecks();

      const snapshot = {
        tick,
        metrics: networkMetrics,
        congestion: networkCongestion,
        bottlenecks
      };

      // 3. Save permanently to PostgreSQL
      const dbSnapshot = {
        simulationId: this.simulationId,
        tick: tick,
        throughput: networkMetrics.throughput,
        latency: networkMetrics.averageLatency || 0,
        packetLoss: networkMetrics.packetLoss,
        congestion: networkCongestion.average,
        totalPackets: networkMetrics.totalPackets,
        deliveredPackets: networkMetrics.deliveredPackets,
        droppedPackets: networkMetrics.droppedPackets,
        healthScore: null,
        healthStatus: null,
        details: {
          maximumCongestion: networkCongestion.maximum,
          bottlenecks: bottlenecks
        },
        networkId: this.networkId
      };

      // Compute health metrics
      let score = 100 - (networkCongestion.average * 50);
      if (networkMetrics.packetLoss > 0) {
        score -= (networkMetrics.packetLoss * 100);
      }
      dbSnapshot.healthScore = Math.max(0, Math.min(100, score));
      dbSnapshot.healthStatus = dbSnapshot.healthScore > 75 ? 'healthy' : dbSnapshot.healthScore > 50 ? 'degraded' : 'critical';

      const network = this.metricsService.network;
      const routerLoads = {};
      if (network && network.routers) {
        for (const [id, r] of network.routers.entries()) {
          routerLoads[id] = r.getLoad();
        }
      }

      const linkUtilization = {};
      if (network && network.links) {
        for (const [id, l] of network.links.entries()) {
          linkUtilization[id] = l.getUtilization();
        }
      }

      const trafficConfiguration = this.generator ? this.generator.streams : [];

      if (process.env.NODE_ENV !== 'test') {
        try {
          await this.snapshotRepository.saveSnapshot(dbSnapshot);
        } catch (err) {
          console.error('Failed to save simulation to database:', err);
        }

        // 4. Save current state to Redis
        try {
          await this.metricsCache.cacheMetrics({
            tick: tick,
            throughput: networkMetrics.throughput,
            latency: networkMetrics.averageLatency || 0,
            packetLoss: networkMetrics.packetLoss,
            congestion: networkCongestion.average,
            bottlenecks: bottlenecks,
            routerLoads,
            linkUtilization,
            trafficConfiguration
          }, this.networkId);

          // Keep the snapshots trend cache warm in Redis
          let cachedSnapshots = await this.metricsCache.getSnapshots(this.networkId);
          if (!cachedSnapshots) {
            cachedSnapshots = await this.snapshotRepository.getAll(this.networkId);
          } else {
            cachedSnapshots.push({
              id: Date.now(),
              simulationId: this.simulationId,
              tick: tick,
              throughput: networkMetrics.throughput,
              latency: networkMetrics.averageLatency || 0,
              packetLoss: networkMetrics.packetLoss,
              congestion: networkCongestion.average,
              totalPackets: networkMetrics.totalPackets,
              deliveredPackets: networkMetrics.deliveredPackets,
              droppedPackets: networkMetrics.droppedPackets,
              healthScore: dbSnapshot.healthScore,
              healthStatus: dbSnapshot.healthStatus,
              details: dbSnapshot.details,
              createdAt: new Date().toISOString()
            });
          }
          await this.metricsCache.cacheSnapshots(cachedSnapshots, this.networkId);
        } catch (err) {
          console.error('Failed to update metrics cache or snapshots in Redis:', err);
        }
      } else {
        // Fallback for tests
        await this.snapshotRepository.saveSnapshot(dbSnapshot);
        await this.metricsCache.cacheMetrics({
          tick: tick,
          throughput: networkMetrics.throughput,
          latency: networkMetrics.averageLatency || 0,
          packetLoss: networkMetrics.packetLoss,
          congestion: networkCongestion.average,
          bottlenecks: bottlenecks,
          routerLoads,
          linkUtilization,
          trafficConfiguration
        }, this.networkId);
      }

      return snapshot;
    } catch (error) {
      console.error('Error during SnapshotService handleTick:', error);
      throw error;
    }
  }

  async getAll() {
    try {
      const cached = await this.metricsCache.getSnapshots(this.networkId);
      if (cached) {
        return cached;
      }
    } catch (err) {
      console.error('Failed to get snapshots from cache:', err);
    }
    const snapshots = await this.snapshotRepository.getAll(this.networkId);
    try {
      await this.metricsCache.cacheSnapshots(snapshots, this.networkId);
    } catch (err) {
      console.error('Failed to cache snapshots in Redis:', err);
    }
    return snapshots;
  }

  async getLatest() {
    return this.snapshotRepository.getLatest(this.networkId);
  }

  /**
   * Helper method to wait for all background ticks to finish writing
   */
  async waitForPending() {
    await Promise.all(this.pendingPromises);
    this.pendingPromises = [];
  }

  /**
   * Unregister listener from simulation clock
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

module.exports = SnapshotService;
