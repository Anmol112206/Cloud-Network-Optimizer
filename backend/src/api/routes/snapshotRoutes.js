/**
 * Snapshot Routes
 * API endpoints for snapshot retrieval
 */
const express = require('express');

function createSnapshotRoutes(snapshotController) {
  const router = express.Router();

  router.get('/', (req, res) => snapshotController.getAll(req, res));
  router.get('/latest', (req, res) => snapshotController.getLatest(req, res));

  return router;
}

module.exports = { createSnapshotRoutes };
