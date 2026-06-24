const Network = require('../src/simulator/Network');
const TopologyBuilder = require('../src/simulator/TopologyBuilder');
const TrafficGenerator = require('../src/simulation/TrafficGenerator');
const RoutingService = require('../src/services/RoutingService');
const NetworkController = require('../src/api/controllers/NetworkController');

describe('Custom Topology Controller Tests', () => {
  let network;
  let topology;
  let generator;
  let routingService;
  let controller;
  let mockRes;

  beforeEach(() => {
    network = new Network();
    topology = new TopologyBuilder(network);
    routingService = new RoutingService(network, topology);
    generator = new TrafficGenerator(network, null, { enabled: true });
    controller = new NetworkController(network, routingService, null, topology, generator);
    
    mockRes = {
      statusCode: 200,
      jsonPayload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonPayload = data;
        return this;
      }
    };
  });

  it('should add router successfully', () => {
    controller.addRouter({ body: { id: 'R5', capacity: 15, processingRate: 3 } }, mockRes);
    expect(mockRes.statusCode).toBe(201);
    expect(network.getRouter('R5')).toBeDefined();
    expect(network.getRouter('R5').getCapacity()).toBe(15);
    expect(network.getRouter('R5').getProcessingRate()).toBe(3);
  });

  it('should update router capacity if it already exists', () => {
    network.addRouter('R5', 10, 1);
    controller.addRouter({ body: { id: 'R5', capacity: 25, processingRate: 4 } }, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(network.getRouter('R5').getCapacity()).toBe(25);
    expect(network.getRouter('R5').getProcessingRate()).toBe(4);
  });

  it('should return 400 when missing fields on addRouter', () => {
    controller.addRouter({ body: { id: 'R5' } }, mockRes);
    expect(mockRes.statusCode).toBe(400);
  });

  it('should add link successfully', () => {
    network.addRouter('R5', 10);
    network.addRouter('R6', 10);

    controller.addLink({ body: { id: 'L10', source: 'R5', target: 'R6', bandwidth: 500, latency: 4 } }, mockRes);
    expect(mockRes.statusCode).toBe(201);
    expect(network.getLink('L10')).toBeDefined();
    expect(network.getLink('L10').getBandwidth()).toBe(500);
    expect(topology.getNeighbors('R5')).toContainEqual(expect.objectContaining({ router: 'R6' }));
  });

  it('should update link details if it already exists', () => {
    network.addRouter('R5', 10);
    network.addRouter('R6', 10);
    network.addLink('L10', 'R5', 'R6', 500, 4);

    controller.addLink({ body: { id: 'L10', source: 'R5', target: 'R6', bandwidth: 800, latency: 1 } }, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(network.getLink('L10').getBandwidth()).toBe(800);
    expect(network.getLink('L10').getLatency()).toBe(1);
  });

  it('should update traffic settings successfully', () => {
    controller.updateTraffic({ body: { packetRate: 3.5, packetSizeMin: 150, packetSizeMax: 2000 } }, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(generator.options.packetRate).toBe(3.5);
    expect(generator.options.packetSizeMin).toBe(150);
    expect(generator.options.packetSizeMax).toBe(2000);
  });

  it('should reset network successfully', () => {
    network.addRouter('R5', 10);
    expect(network.routers.size).toBe(1);

    controller.resetNetwork({}, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(network.routers.size).toBe(0);
  });

  it('should reset network and clear simulation components successfully', async () => {
    network.addRouter('R5', 10);
    expect(network.routers.size).toBe(1);

    const mockClock = { reset: jest.fn() };
    const mockSimulator = { activeTransits: { clear: jest.fn() } };
    const mockSnapshotRepository = { clear: jest.fn() };
    const mockSnapshotService = { snapshotRepository: mockSnapshotRepository };
    const mockMetricsCache = { clearTopology: jest.fn() };

    const mockRouterRepository = { clear: jest.fn() };
    const mockLinkRepository = { clear: jest.fn() };

    const testController = new NetworkController(network, routingService, null, topology, generator, {
      metricsCache: mockMetricsCache,
      routerRepository: mockRouterRepository,
      linkRepository: mockLinkRepository,
      bypassPersistence: false
    });

    const mockReq = {
      networkContext: {
        network,
        topology,
        routingService,
        networkId: 'test-network',
        clock: mockClock,
        simulator: mockSimulator,
        snapshotService: mockSnapshotService
      }
    };

    await testController.resetNetwork(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(network.routers.size).toBe(0);
    expect(mockClock.reset).toHaveBeenCalled();
    expect(mockSimulator.activeTransits.clear).toHaveBeenCalled();
    expect(mockRouterRepository.clear).toHaveBeenCalledWith('test-network');
    expect(mockLinkRepository.clear).toHaveBeenCalledWith('test-network');
    expect(mockMetricsCache.clearTopology).toHaveBeenCalledWith('test-network');
    expect(mockSnapshotRepository.clear).toHaveBeenCalledWith('test-network');
  });
});
