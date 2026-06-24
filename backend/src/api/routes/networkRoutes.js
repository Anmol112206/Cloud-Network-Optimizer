/**
 * Network Routes
 * API endpoints for network operations
 */
const express = require('express');

function createNetworkRoutes(networkController) {
  const router = express.Router();

  // Network statistics
  router.get('/stats', (req, res) => networkController.getNetworkStats(req, res));

  // Packet management
  router.post('/packets', (req, res) => networkController.createPacket(req, res));
  router.post('/packets/route', (req, res) => networkController.routePacket(req, res));

  // Congestion monitoring
  router.get('/congestion', (req, res) => networkController.getCongestion(req, res));
  router.get('/congestion/:routerId', (req, res) => networkController.getCongestion(req, res));


  // Custom Topology builder endpoints
  router.post('/routers', (req, res) => networkController.addRouter(req, res));
  router.post('/links', (req, res) => networkController.addLink(req, res));
  router.post('/traffic', (req, res) => networkController.updateTraffic(req, res));
  router.post('/reset', (req, res) => networkController.resetNetwork(req, res));

  return router;
}

module.exports = { createNetworkRoutes };
