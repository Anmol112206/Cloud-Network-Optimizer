/**
 * Congestion Routes
 * API endpoints for congestion and bottlenecks monitoring
 */
const express = require('express');

function createCongestionRoutes(congestionController) {
  const router = express.Router();

  router.get('/congestion', (req, res) => congestionController.getCongestion(req, res));
  router.get('/bottlenecks', (req, res) => congestionController.getBottlenecks(req, res));

  return router;
}

module.exports = { createCongestionRoutes };
