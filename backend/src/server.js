/**
 * Server Entry Point
 * Initializes and starts the Express server
 */
const app = require('./app');
const Logger = require('./infrastructure/logger/Logger');
const simulationManager = require('./services/SimulationManager');
const realNetworkMonitor = require('./monitoring/RealNetworkMonitor');

const logger = new Logger('server');
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  try {
    realNetworkMonitor.stopCollector();
  } catch (err) {
    logger.error('Failed to stop RealNetworkMonitor:', err);
  }
  simulationManager.shutdown();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  try {
    realNetworkMonitor.stopCollector();
  } catch (err) {
    logger.error('Failed to stop RealNetworkMonitor:', err);
  }
  simulationManager.shutdown();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = server;
