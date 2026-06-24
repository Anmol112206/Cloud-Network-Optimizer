const redis = require('./RedisClient');

class MetricsCache {
  constructor() {
    this.key = 'metrics:latest'; // kept for backward compatibility/default
  }

  getMetricsKey(networkId = 'default-network') {
    return `metrics:${networkId}:latest`;
  }
  getRoutersKey(networkId = 'default-network') {
    return `topology:${networkId}:routers`;
  }
  getLinksKey(networkId = 'default-network') {
    return `topology:${networkId}:links`;
  }
  getTrafficKey(networkId = 'default-network') {
    return `topology:${networkId}:traffic`;
  }
  getSnapshotsKey(networkId = 'default-network') {
    return `snapshots:${networkId}:all`;
  }

  async connect() {
    if (!redis.isOpen) {
      await redis.connect();
    }
  }

  async disconnect() {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  }

  async cacheMetrics(metrics, networkId = 'default-network') {
    await this.connect();
    const dataToCache = {
      tick: metrics.tick,
      routerLoads: metrics.routerLoads || {},
      linkUtilization: metrics.linkUtilization || {},
      trafficConfiguration: metrics.trafficConfiguration || null,
      metrics: {
        throughput: metrics.throughput,
        latency: metrics.latency,
        packetLoss: metrics.packetLoss,
        congestion: metrics.congestion,
        bottlenecks: metrics.bottlenecks
      },
      // Flattened properties preserved for backward compatibility
      throughput: metrics.throughput,
      latency: metrics.latency,
      packetLoss: metrics.packetLoss,
      congestion: metrics.congestion,
      bottlenecks: metrics.bottlenecks,
      timestamp: Date.now()
    };
    await redis.set(this.getMetricsKey(networkId), JSON.stringify(dataToCache));
  }

  async getCurrentMetrics(networkId = 'default-network') {
    await this.connect();
    const data = await redis.get(this.getMetricsKey(networkId));
    return data ? JSON.parse(data) : null;
  }

  
  async getRouters(networkId = 'default-network') {
    await this.connect();
    const data = await redis.get(this.getRoutersKey(networkId));
    return data ? JSON.parse(data) : null;
  }
  
  async getLinks(networkId = 'default-network') {
    await this.connect();
    const data = await redis.get(this.getLinksKey(networkId));
    return data ? JSON.parse(data) : null;
  }
  
  async getTraffic(networkId = 'default-network') {
    await this.connect();
    const data = await redis.get(this.getTrafficKey(networkId));
    return data ? JSON.parse(data) : null;
  }
  
  async cacheRouters(routers, networkId = 'default-network') {
    await this.connect();
    await redis.set(this.getRoutersKey(networkId), JSON.stringify(routers));
  }

  async cacheLinks(links, networkId = 'default-network') {
    await this.connect();
    await redis.set(this.getLinksKey(networkId), JSON.stringify(links));
  }

  async cacheTraffic(traffic, networkId = 'default-network') {
    await this.connect();
    await redis.set(this.getTrafficKey(networkId), JSON.stringify(traffic));
  }


  async clearTopology(networkId = 'default-network') {
    await this.connect();
    await redis.del(this.getRoutersKey(networkId));
    await redis.del(this.getLinksKey(networkId));
    await redis.del(this.getTrafficKey(networkId));
    await redis.del(this.getMetricsKey(networkId));
    await redis.del(this.getSnapshotsKey(networkId));
  }

  async cacheSnapshots(snapshots, networkId = 'default-network') {
    await this.connect();
    // Cache the last 100 snapshots to keep memory usage low and fast
    const recent = snapshots.slice(-100);
    await redis.set(this.getSnapshotsKey(networkId), JSON.stringify(recent));
  }

  async getSnapshots(networkId = 'default-network') {
    await this.connect();
    const data = await redis.get(this.getSnapshotsKey(networkId));
    return data ? JSON.parse(data) : null;
  }
}

module.exports = new MetricsCache();

