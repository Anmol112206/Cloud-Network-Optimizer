/**
 * Congestion Controller
 * Handles congestion-related API requests
 */
class CongestionController {
  constructor(congestionService) {
    this.congestionService = congestionService;
  }

  async getCongestion(req, res) {
    try {
      const congestionService = req.networkContext?.congestionService || this.congestionService;
      const congestion = await congestionService.getCurrentCongestion(req.networkId);
      res.json(congestion);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBottlenecks(req, res) {
    try {
      const congestionService = req.networkContext?.congestionService || this.congestionService;
      const bottlenecks = await congestionService.getBottlenecks(req.networkId);
      res.json(bottlenecks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CongestionController;
