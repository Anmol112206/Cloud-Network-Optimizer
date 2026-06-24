/**
 * Metrics Routes
 * API endpoints for metrics monitoring
 */
const express = require('express');

function createMetricsRoutes(metricsController) {
  const router = express.Router();

  router.get('/', (req, res) => metricsController.getCurrentMetrics(req, res));

  return router;
}

module.exports = { createMetricsRoutes };
