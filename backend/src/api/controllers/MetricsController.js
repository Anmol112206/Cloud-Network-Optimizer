/**
 * Metrics Controller
 * Handles metrics-related API requests
 */
class MetricsController {
  constructor(metricsService) {
    this.metricsService = metricsService;
  }

  async getCurrentMetrics(req, res) {
    try {
      const metricsService = req.networkContext?.metricsService || this.metricsService;
      const metrics = await metricsService.getCurrentMetrics(req.networkId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = MetricsController;
