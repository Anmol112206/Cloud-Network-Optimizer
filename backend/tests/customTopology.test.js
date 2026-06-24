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

  it('should update link details in-place under existing ID if adding a link between same routers', async () => {
    network.addRouter('R5', 10);
    network.addRouter('R6', 10);
    network.addLink('L10', 'R5', 'R6', 500, 4);
    topology.addConnection('R5', 'R6', 'L10');

    await controller.addLink({ body: { id: 'L11', source: 'R5', target: 'R6', bandwidth: 700, latency: 2 } }, mockRes);
    expect(mockRes.statusCode).toBe(200);
    
    expect(network.getLink('L10')).toBeDefined();
    expect(network.getLink('L10').getBandwidth()).toBe(700);
    expect(network.getLink('L10').getLatency()).toBe(2);
    expect(network.getLink('L11')).toBeUndefined();

    const neighbors = topology.getNeighbors('R5');
    expect(neighbors.length).toBe(1);
    expect(neighbors[0].link).toBe('L10');
  });

  it('should return 400 when missing fields or invalid inputs on addLink', () => {
    controller.addLink({ body: { id: 'L10', source: 'R5', target: 'R6' } }, mockRes);
    expect(mockRes.statusCode).toBe(400);

    controller.addLink({ body: { id: 'L10', source: 'R5', target: 'R6', bandwidth: -500, latency: 4 } }, mockRes);
    expect(mockRes.statusCode).toBe(400);

    controller.addLink({ body: { id: 'L10', source: 'R5', target: 'R6', bandwidth: 500, latency: -4 } }, mockRes);
    expect(mockRes.statusCode).toBe(400);

    controller.addLink({ body: { id: 'L10', source: 'R5', target: 'R6', bandwidth: 'invalid', latency: 4 } }, mockRes);
    expect(mockRes.statusCode).toBe(400);
  });

  it('should update traffic settings successfully', () => {
    controller.updateTraffic({ body: { packetRate: 3.5, packetSizeMin: 150, packetSizeMax: 2000 } }, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(generator.streams.length).toBe(1);
    expect(generator.streams[0].packetRate).toBe(3.5);
    expect(generator.streams[0].packetSizeMin).toBe(150);
    expect(generator.streams[0].packetSizeMax).toBe(2000);
  });



  it('should delete traffic stream successfully', async () => {
    const streamId = 'T-test-123';
    generator.streams = [{
      id: streamId,
      packetRate: 1.5,
      packetSizeMin: 100,
      packetSizeMax: 1500,
      enabled: true,
      source: 'R1',
      destination: 'R2'
    }];
    await controller.deleteTrafficStream({ params: { id: streamId } }, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(generator.streams.length).toBe(0);
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
    const mockTrafficRepository = { clear: jest.fn() };

    const testController = new NetworkController(network, routingService, null, topology, generator, {
      metricsCache: mockMetricsCache,
      routerRepository: mockRouterRepository,
      linkRepository: mockLinkRepository,
      trafficRepository: mockTrafficRepository,
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
    expect(mockTrafficRepository.clear).toHaveBeenCalledWith('test-network');
    expect(mockMetricsCache.clearTopology).toHaveBeenCalledWith('test-network');
    expect(mockSnapshotRepository.clear).toHaveBeenCalledWith('test-network');
  });

  it('should start simulation successfully', async () => {
    generator.options.enabled = false;
    await controller.startSimulation({}, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(generator.options.enabled).toBe(true);
    expect(mockRes.jsonPayload.trafficEnabled).toBe(true);
  });

  it('should stop simulation successfully', async () => {
    generator.options.enabled = true;
    await controller.stopSimulation({}, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(generator.options.enabled).toBe(false);
    expect(mockRes.jsonPayload.trafficEnabled).toBe(false);
  });

  it('should reset packet flow components successfully', async () => {
    network.addRouter('R5', 10);
    network.addRouter('R6', 10);
    network.addLink('L10', 'R5', 'R6', 500, 4);
    
    const packet = network.createPacket('P1', 'R5', 'R6', 100, 1);
    packet.setStatus('ROUTED');
    
    const router = network.getRouter('R5');
    router.processPacket(packet);
    const link = network.getLink('L10');
    link.transmit(packet);
    
    const mockClock = { reset: jest.fn() };
    const mockSimulator = { activeTransits: { clear: jest.fn() } };
    
    const mockReq = {
      networkContext: {
        network,
        topology,
        routingService,
        networkId: 'test-network',
        clock: mockClock,
        simulator: mockSimulator,
        generator
      }
    };
    
    await controller.resetPackets(mockReq, mockRes);
    
    expect(mockRes.statusCode).toBe(200);
    expect(network.getPackets().length).toBe(0);
    expect(network.time).toBe(0);
    expect(router.getQueueLength()).toBe(0);
    expect(router.processed).toBe(0);
    expect(link.packets.length).toBe(0);
    expect(link.currentUsage).toBe(0);
    expect(mockClock.reset).toHaveBeenCalled();
    expect(mockSimulator.activeTransits.clear).toHaveBeenCalled();
  });

  it('should delete link successfully', async () => {
    network.addRouter('R5', 10);
    network.addRouter('R6', 10);
    network.addLink('L10', 'R5', 'R6', 500, 4);
    topology.addConnection('R5', 'R6', 'L10');

    const mockReq = {
      params: { id: 'L10' },
      networkContext: {
        network,
        topology,
        routingService,
        networkId: 'test-network'
      }
    };

    await controller.deleteLink(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(network.getLink('L10')).toBeUndefined();
    expect(topology.getNeighbors('R5').length).toBe(0);
  });

  it('should return 404 when link to delete is not found', async () => {
    const mockReq = {
      params: { id: 'L999' },
      networkContext: {
        network,
        topology,
        routingService,
        networkId: 'test-network'
      }
    };

    await controller.deleteLink(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(404);
  });

  it('should delete router successfully and clean up linked elements', async () => {
    network.addRouter('R5', 10);
    network.addRouter('R6', 10);
    network.addLink('L10', 'R5', 'R6', 500, 4);
    topology.addConnection('R5', 'R6', 'L10');
    
    generator.streams = [
      { id: 'T1', source: 'R5', destination: 'R6' },
      { id: 'T2', source: 'R7', destination: 'R8' }
    ];

    const mockReq = {
      params: { id: 'R5' },
      networkContext: {
        network,
        topology,
        routingService,
        networkId: 'test-network',
        generator
      }
    };

    await controller.deleteRouter(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(200);
    expect(network.getRouter('R5')).toBeUndefined();
    expect(network.getLink('L10')).toBeUndefined();
    expect(generator.streams.length).toBe(1);
    expect(generator.streams[0].id).toBe('T2');
  });

  it('should return 404 when router to delete is not found', async () => {
    const mockReq = {
      params: { id: 'R99' },
      networkContext: {
        network,
        topology,
        routingService,
        networkId: 'test-network',
        generator
      }
    };

    await controller.deleteRouter(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(404);
  });
});
