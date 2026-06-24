/**
 * Congestion Service
 * Monitors and manages network congestion
 */
const metricsCacheDefault = require('../infrastructure/redis/MetricsCache');
class CongestionService {
  constructor(network, metricsCache = metricsCacheDefault, options = {}) {
    this.network = network;
    this.congestionThreshold = Number(process.env.CONGESTION_THRESHOLD || 0.8);
    this.history = [];
    this.metricsCache = metricsCache;
    this.networkId = options.networkId || 'default-network';
  }

  async getCurrentCongestion(networkId) {
    const finalId = networkId || this.networkId || 'default-network';
    const cached = await this.metricsCache.getCurrentMetrics(finalId);
    const trendData = this.getCongestionTrend() || { average: 0, trend: 'stable' };

    if (cached) {
      return {
        average: cached.congestion,
        trend: trendData.trend
      };
    }

    const current = this.getNetworkCongestion();
    return {
      average: current.average,
      trend: trendData.trend
    };
  }

  async getBottlenecks(networkId) {
    const finalId = networkId || this.networkId || 'default-network';
    const cached = await this.metricsCache.getCurrentMetrics(finalId);
    if (cached && cached.bottlenecks) {
      return cached.bottlenecks.map(b => ({
        linkId: b.linkId,
        utilization: b.utilization
      }));
    }

    const bottlenecks = this.identifyBottlenecks();
    return bottlenecks.map(b => ({
      linkId: b.linkId,
      utilization: b.utilization
    }));
  }

  getCongestionLevel(routerId) {
    const router = this.network.getRouter(routerId);
    if (!router) return null;
    return router.getLoad();
  }

  detectCongestedRouters() {
    const routers = Array.from(this.network.routers.values());
    return routers
      .map(r => ({
        routerId: r.getId(),
        utilization: r.getLoad()
      }))
      .filter(m => m.utilization >= this.congestionThreshold);
  }

  detectCongestedLinks() {
    const links = Array.from(this.network.links.values());
    return links
      .map(l => ({
        linkId: l.getId(),
        utilization: l.getUtilization()
      }))
      .filter(m => m.utilization >= this.congestionThreshold);
  }

  getNetworkCongestion() {
    const routers = Array.from(this.network.routers.values());
    const loads = routers.map(r => r.getLoad());
    const avgLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
    const maxLoad = loads.length > 0 ? Math.max(...loads) : 0;

    return {
      average: avgLoad,
      maximum: maxLoad,
      isCongested: maxLoad >= this.congestionThreshold
    };
  }

  getCongestionReport() {
    const routers = Array.from(this.network.routers.values());
    const congestedRouters = routers
      .filter(r => r.getLoad() >= this.congestionThreshold)
      .map(r => ({
        routerId: r.getId(),
        load: r.getLoad(),
        queueLength: r.getQueueLength(),
        capacity: r.getCapacity()
      }));

    return {
      timestamp: Date.now(),
      totalCongested: congestedRouters.length,
      routers: congestedRouters,
      networkStats: this.getNetworkCongestion()
    };
  }

  recordCongestionSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      congestion: this.getNetworkCongestion(),
      details: this.getCongestionReport()
    };

    this.history.push(snapshot);

    // Keep only last 1000 snapshots
    if (this.history.length > 1000) {
      this.history.shift();
    }

    return snapshot;
  }

  getCongestionTrend(windowSize = 10) {
    const recent = this.history.slice(-windowSize);
    if (recent.length === 0) return null;

    const avgCongestion = recent.reduce((sum, snap) => sum + snap.congestion.average, 0) / recent.length;
    const trend = recent.length > 1 
      ? recent[recent.length - 1].congestion.average - recent[0].congestion.average 
      : 0;

    return {
      average: avgCongestion,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      trendValue: trend
    };
  }

  setCongestionThreshold(threshold) {
    this.congestionThreshold = Math.max(0, Math.min(1, threshold));
  }

  identifyBottlenecks() {
    const links = Array.from(this.network.links.values());
    const bottlenecks = links
      .filter(l => l.getUtilization() >= this.congestionThreshold)
      .map(l => ({
        linkId: l.getId(),
        source: l.getSource(),
        target: l.getTarget(),
        load: l.getLoad(),
        utilization: l.getUtilization()
      }));

    return bottlenecks;
  }
}

module.exports = CongestionService;
