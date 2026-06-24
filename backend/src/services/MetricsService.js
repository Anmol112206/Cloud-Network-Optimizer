const Packet = require('../domain/entities/Packet');
const metricsCacheDefault = require('../infrastructure/redis/MetricsCache');

/**
 * Metrics Service
 * Computes KPIs for Routers, Links, and overall Network performance
 */
class MetricsService {
  constructor(network, clock, metricsCache = metricsCacheDefault, options = {}) {
    this.network = network;
    this.clock = clock;
    this.metricsCache = metricsCache;
    this.networkId = options.networkId || 'default-network';
  }

  async getCurrentMetrics(networkId) {
    const finalNetworkId = networkId || this.networkId || 'default-network';
    const cached = await this.metricsCache.getCurrentMetrics(finalNetworkId);
    if (cached) {
      return {
        throughput: cached.throughput,
        latency: cached.latency,
        packetLoss: cached.packetLoss !== undefined ? cached.packetLoss : 0
      };
    }

    const networkMetrics = this.getNetworkMetrics();
    return {
      throughput: networkMetrics.throughput,
      latency: networkMetrics.averageLatency || 0,
      packetLoss: networkMetrics.packetLoss
    };
  }

  /**
   * Router metrics: Queue Length, Utilization, Packets Processed
   */
  getRouterMetrics(routerId) {
    const router = this.network.getRouter(routerId);
    if (!router) return null;

    return {
      routerId,
      queueLength: router.getQueueLength(),
      utilization: router.getLoad(),
      packetsProcessed: router.processed
    };
  }

  /**
   * Link metrics: Bandwidth Usage, Utilization
   */
  getLinkMetrics(linkId) {
    const link = this.network.getLink(linkId);
    if (!link) return null;

    return {
      linkId,
      bandwidthUsage: link.currentUsage,
      utilization: link.getUtilization()
    };
  }

  /**
   * Network metrics: Throughput, Average Latency, Packet Loss
   */
  getNetworkMetrics() {
    const packets = this.network.getPackets();
    
    // Ticks elapsed in simulation
    const currentTick = this.clock ? this.clock.getCurrentTime() : 1;

    // Use a rolling window of the last 10 ticks for real-time responsiveness
    const WINDOW_SIZE = 10;
    const windowStart = Math.max(0, currentTick - WINDOW_SIZE + 1);

    const rollingDelivered = packets.filter(p => 
      p.getStatus() === Packet.States.DELIVERED && 
      (p.deliveredAt !== null ? p.deliveredAt : p.createdAt) >= windowStart
    );

    const rollingDropped = packets.filter(p => 
      p.getStatus() === Packet.States.DROPPED && 
      (p.droppedAt !== null ? p.droppedAt : p.createdAt) >= windowStart
    );

    const rollingDeliveredCount = rollingDelivered.length;
    const rollingDroppedCount = rollingDropped.length;
    const rollingTotalCount = rollingDeliveredCount + rollingDroppedCount;

    // KPI 1: Throughput = DeliveredPackets in window / Elapsed ticks in window
    const elapsedTicksInWindow = windowStart === 0 ? currentTick : currentTick - windowStart + 1;
    const throughput = elapsedTicksInWindow > 0 ? rollingDeliveredCount / elapsedTicksInWindow : 0;

    // KPI 2: Packet Loss = Dropped / Total in window
    const packetLoss = rollingTotalCount > 0 ? rollingDroppedCount / rollingTotalCount : 0;

    // KPI 3: Average Latency = sum(deliveredTick - createdTick) in this window / delivered count in window
    const totalLatency = rollingDelivered.reduce((sum, p) => sum + p.getDeliveryTime(), 0);
    const avgLatency = rollingDeliveredCount > 0 ? totalLatency / rollingDeliveredCount : 0;

    return {
      throughput,
      packetLoss,
      averageLatency: avgLatency,
      totalPackets: rollingTotalCount,
      deliveredPackets: rollingDeliveredCount,
      droppedPackets: rollingDroppedCount
    };
  }
}

module.exports = MetricsService;
