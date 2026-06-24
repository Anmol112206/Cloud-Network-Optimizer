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
    const totalPackets = packets.length;
    
    // Ticks elapsed in simulation
    const ticks = this.clock ? this.clock.getCurrentTime() : 1;

    // Filter packet collections
    const deliveredPackets = packets.filter(p => p.getStatus() === Packet.States.DELIVERED);
    const droppedCount = packets.filter(p => p.getStatus() === Packet.States.DROPPED).length;

    // KPI 1: Throughput = DeliveredPackets / Ticks
    const throughput = ticks > 0 ? deliveredPackets.length / ticks : 0;

    // KPI 2: Packet Loss = Dropped / TotalPackets
    const packetLoss = totalPackets > 0 ? droppedCount / totalPackets : 0;

    // KPI 3: Average Latency = sum(deliveredTick - createdTick) / count
    const totalLatency = deliveredPackets.reduce((sum, p) => sum + p.getDeliveryTime(), 0);
    const avgLatency = deliveredPackets.length > 0 ? totalLatency / deliveredPackets.length : 0;

    return {
      throughput,
      packetLoss,
      averageLatency: avgLatency,
      totalPackets,
      deliveredPackets: deliveredPackets.length,
      droppedPackets: droppedCount
    };
  }
}

module.exports = MetricsService;
