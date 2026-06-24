const redis = require('../../infrastructure/redis/RedisClient');
const realNetworkMonitor = require('../../monitoring/RealNetworkMonitor');

class RealNetworkController {
  async getLive(req, res) {
    try {
      if (!redis.isOpen) {
        await redis.connect();
      }
      const cached = await redis.get('network:live');
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      // Fallback
      const stats = await realNetworkMonitor.getCurrentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getHistory(req, res) {
    try {
      if (!redis.isOpen) {
        await redis.connect();
      }
      const rawList = await redis.lRange('network:history', 0, -1);
      const history = (rawList || []).map(item => JSON.parse(item));
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new RealNetworkController();
