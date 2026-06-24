const si = require('systeminformation');
const redis = require('../infrastructure/redis/RedisClient');

class RealNetworkMonitor {
  constructor() {
    this.intervalId = null;
    this.isCollecting = false;
  }

  async getCurrentStats() {
    try {
      const stats = await si.networkStats();
      const network = (stats && stats.length > 0) ? stats[0] : null;
      if (!network) {
        return {
          interface: 'unknown',
          downloadMbps: 0,
          uploadMbps: 0,
          downloadedBytes: 0,
          uploadedBytes: 0,
          status: 'down'
        };
      }

      return {
        interface: network.iface || 'unknown',
        downloadMbps: parseFloat(((network.rx_sec * 8) / 1000000).toFixed(2)) || 0,
        uploadMbps: parseFloat(((network.tx_sec * 8) / 1000000).toFixed(2)) || 0,
        downloadedBytes: network.rx_bytes || 0,
        uploadedBytes: network.tx_bytes || 0,
        status: network.operstate || 'unknown'
      };
    } catch (error) {
      console.error('Error fetching live PC metrics:', error);
      return {
        interface: 'error',
        downloadMbps: 0,
        uploadMbps: 0,
        downloadedBytes: 0,
        uploadedBytes: 0,
        status: 'down'
      };
    }
  }

  async startCollector(intervalMs = 2000) {
    if (this.isCollecting) return;
    this.isCollecting = true;

    if (!redis.isOpen) {
      try {
        await redis.connect();
      } catch (e) {
        console.error('Redis connection error in RealNetworkMonitor:', e);
      }
    }

    this.intervalId = setInterval(async () => {
      try {
        const stats = await this.getCurrentStats();
        
        // Store latest stats
        await redis.set('network:live', JSON.stringify(stats));

        // Add to history (push to head, trim list to 30 elements)
        const historyItem = {
          ...stats,
          timestamp: Date.now()
        };
        await redis.lPush('network:history', JSON.stringify(historyItem));
        await redis.lTrim('network:history', 0, 29);
      } catch (err) {
        console.error('Error in RealNetworkMonitor collector tick:', err);
      }
    }, intervalMs);
  }

  stopCollector() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isCollecting = false;
  }
}

module.exports = new RealNetworkMonitor();
