/**
 * Express Application Setup
 * Configures and initializes the Express app
 */
require('dotenv').config();
const express = require('express');
const requestLogger = require('./api/middleware/requestLogger');
const errorHandler = require('./api/middleware/errorHandler');
const { createNetworkRoutes } = require('./api/routes/networkRoutes');
const { createMetricsRoutes } = require('./api/routes/metricsRoutes');
const { createCongestionRoutes } = require('./api/routes/congestionRoutes');
const { createSnapshotRoutes } = require('./api/routes/snapshotRoutes');

const NetworkController = require('./api/controllers/NetworkController');
const MetricsController = require('./api/controllers/MetricsController');
const CongestionController = require('./api/controllers/CongestionController');
const SnapshotController = require('./api/controllers/SnapshotController');

const metricsCache = require('./infrastructure/redis/MetricsCache');
const savedSimulationRepository = require('./infrastructure/database/SavedSimulationRepository');
const Logger = require('./infrastructure/logger/Logger');

const app = express();
const logger = new Logger('app');

const simulationManager = require('./services/SimulationManager');

// Register default context in simulationManager synchronously using the manager helper
const defaultContext = simulationManager.createContextSync('default-network');
simulationManager.contexts.set('default-network', defaultContext);

const {
  network,
  topology,
  routingService,
  congestionService,
  clock,
  metricsService,
  generator,
  simulator,
  snapshotService
} = defaultContext;

async function initializeTopologyAndSettings() {
  try {
    logger.info('Initializing network topology and traffic settings...');
    
    await simulationManager.ensureNetworkInDb('default-network');

    await simulationManager.loadTopologyAndSettings(defaultContext);

    logger.info('Successfully initialized default network topology.');
  } catch (err) {
    logger.error('Failed to initialize topology and settings:', err);
  }
}

// Start background simulation ticks (skip in test environment to avoid hanging Jest)
if (process.env.NODE_ENV !== 'test') {
  initializeTopologyAndSettings().then(() => {
    // Bind interval to default context
    defaultContext.tickInterval = setInterval(() => {
      if (generator && generator.options.enabled) {
        clock.tick();
      }
    }, 2000);

    // Start Real Network Monitor collector
    const realNetworkMonitor = require('./monitoring/RealNetworkMonitor');
    realNetworkMonitor.startCollector(2000).catch(err => {
      logger.error('Failed to start RealNetworkMonitor collector:', err);
    });
  });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(requestLogger); // Disabled to prevent console clutter from frequent client polling

// X-Network-Id header middleware
app.use(async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const networkId = req.headers['x-network-id'] || 'default-network';
    req.networkId = networkId;
    req.networkContext = await simulationManager.getOrCreateContext(networkId);
    next();
  } catch (err) {
    next(err);
  }
});

// Controllers
const networkController = new NetworkController(network, routingService, congestionService, topology, generator);
const metricsController = new MetricsController(metricsService);
const congestionController = new CongestionController(congestionService);
const snapshotController = new SnapshotController(snapshotService);
const realNetworkController = require('./api/controllers/RealNetworkController');

// Routes
app.use('/api/network', createNetworkRoutes(networkController));

// Live network monitoring routes
app.get('/api/network/live', (req, res) => realNetworkController.getLive(req, res));
app.get('/api/network/history', (req, res) => realNetworkController.getHistory(req, res));

// New API endpoints under /api
app.use('/api/metrics', createMetricsRoutes(metricsController));
app.use('/api', createCongestionRoutes(congestionController));
app.use('/api/snapshots', createSnapshotRoutes(snapshotController));

// Compatibility fallback endpoints at root
app.use('/metrics', createMetricsRoutes(metricsController));
app.use('/', createCongestionRoutes(congestionController));
app.use('/snapshots', createSnapshotRoutes(snapshotController));
app.get('/network/live', (req, res) => realNetworkController.getLive(req, res));
app.get('/network/history', (req, res) => realNetworkController.getHistory(req, res));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Export services for external use or globally 
app.locals.network = network;
app.locals.topology = topology;
app.locals.routingService = routingService;
app.locals.congestionService = congestionService;
app.locals.clock = clock;
app.locals.metricsService = metricsService;
app.locals.snapshotService = snapshotService;
app.locals.metricsCache = metricsCache;
app.locals.savedSimulationRepository = savedSimulationRepository;
app.locals.logger = logger;

logger.info('Application initialized');

module.exports = app;
