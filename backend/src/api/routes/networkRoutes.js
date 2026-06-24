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
  router.delete('/routers/:id', (req, res) => networkController.deleteRouter(req, res));
  router.post('/links', (req, res) => networkController.addLink(req, res));
  router.delete('/links/:id', (req, res) => networkController.deleteLink(req, res));
  router.post('/traffic', (req, res) => networkController.updateTraffic(req, res));
  router.delete('/traffic/:id', (req, res) => networkController.deleteTrafficStream(req, res));
  router.post('/reset', (req, res) => networkController.resetNetwork(req, res));

  // Simulation controls
  router.post('/simulation/start', (req, res) => networkController.startSimulation(req, res));
  router.post('/simulation/stop', (req, res) => networkController.stopSimulation(req, res));
  router.post('/simulation/reset-packets', (req, res) => networkController.resetPackets(req, res));

  return router;
}

module.exports = { createNetworkRoutes };
