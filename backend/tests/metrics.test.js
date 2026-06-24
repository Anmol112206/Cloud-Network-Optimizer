const Network = require('../src/simulator/Network');
const Router = require('../src/domain/entities/Router');
const Link = require('../src/domain/entities/Link');
const Packet = require('../src/domain/entities/Packet');
const QueueManager = require('../src/services/QueueManager');
const CongestionService = require('../src/services/CongestionService');
const MetricsService = require('../src/services/MetricsService');
const SimulationClock = require('../src/simulation/SimulationClock');

describe('Metrics and Congestion Engine Suite', () => {
  let network;
  let clock;
  let congestionService;
  let metricsService;

  beforeEach(() => {
    network = new Network();
    clock = new SimulationClock();
    congestionService = new CongestionService(network);
    metricsService = new MetricsService(network, clock);
  });

  describe('QueueManager', () => {
    it('should manage enqueuing and dequeuing correctly', () => {
      const qm = new QueueManager(3);
      expect(qm.hasCapacity()).toBe(true);

      const p1 = new Packet('P1', 'A', 'B', 100);
      const p2 = new Packet('P2', 'A', 'B', 100);
      const p3 = new Packet('P3', 'A', 'B', 100);
      const p4 = new Packet('P4', 'A', 'B', 100);

      expect(qm.enqueue(p1)).toBe(true);
      expect(qm.enqueue(p2)).toBe(true);
      expect(qm.enqueue(p3)).toBe(true);
      expect(qm.enqueue(p4)).toBe(false); // full

      expect(qm.hasCapacity()).toBe(false);
      expect(qm.getCurrentQueueLength()).toBe(3);
      expect(qm.getUtilization()).toBe(1.0);

      // Dequeue
      expect(qm.dequeue()).toBe(p1);
      expect(qm.getCurrentQueueLength()).toBe(2);
      expect(qm.getProcessedCount()).toBe(1);
    });

    it('should calculate estimated wait time', () => {
      const qm = new QueueManager(10);
      const p1 = new Packet('P1', 'A', 'B', 100);
      const p2 = new Packet('P2', 'A', 'B', 100);

      qm.enqueue(p1);
      qm.enqueue(p2);

      // Wait time = Queue Length / processingRate
      expect(qm.calculateWaitTime(2)).toBe(1); // 2 packets / rate 2 = 1 tick
      expect(qm.calculateWaitTime(0.5)).toBe(4); // 2 packets / rate 0.5 = 4 ticks
    });
  });

  describe('Router delegation to QueueManager', () => {
    it('should configure router and forward calls', () => {
      const router = new Router('R1', 5, 2);
      expect(router.getCapacity()).toBe(5);
      expect(router.getProcessingRate()).toBe(2);

      const packet = new Packet('P1', 'A', 'B', 100);
      expect(router.processPacket(packet)).toBe(true);
      expect(router.getQueueLength()).toBe(1);
      expect(router.getLoad()).toBe(0.2); // 1/5 = 0.2
      expect(router.queue).toEqual([packet]); // compatibility getter
    });
  });

  describe('Link currentUsage and utilization', () => {
    it('should compute static utilization correctly', () => {
      const link = new Link('L1', 'R1', 'R2', 100, 10);
      link.setCurrentUsage(85); // 85 Mbps
      expect(link.getUtilization()).toBe(0.85);
      expect(link.getLoad()).toBe(85);
    });

    it('should fall back to packet size calculation if currentUsage is 0', () => {
      const link = new Link('L1', 'R1', 'R2', 100, 10);
      const p1 = new Packet('P1', 'R1', 'R2', 100); // 100 Bytes
      link.transmit(p1);

      // 1 packet of 100 Bytes = 0.0001 Megabytes.
      // 0.0001 / 100 = 0.000001 (0.0001%)
      expect(link.getUtilization()).toBe(0.000001);
    });
  });

  describe('CongestionService congestion detection', () => {
    beforeEach(() => {
      congestionService.setCongestionThreshold(0.8);
    });

    it('should identify congested routers', () => {
      const r1 = network.addRouter('R1', 10);
      const r2 = network.addRouter('R2', 10);

      // Queue 9 packets in R1 (9/10 = 0.9 > 0.8)
      for (let i = 0; i < 9; i++) {
        r1.processPacket(new Packet(`P${i}`, 'A', 'B', 100));
      }

      // Queue 5 packets in R2 (5/10 = 0.5 <= 0.8)
      for (let i = 0; i < 5; i++) {
        r2.processPacket(new Packet(`P2_${i}`, 'A', 'B', 100));
      }

      const congested = congestionService.detectCongestedRouters();
      expect(congested.length).toBe(1);
      expect(congested[0].routerId).toBe('R1');
      expect(congested[0].utilization).toBe(0.9);
    });

    it('should identify congested links', () => {
      const l1 = network.addLink('L1', 'R1', 'R2', 100, 10);
      const l2 = network.addLink('L2', 'R2', 'R3', 100, 10);

      l1.setCurrentUsage(95); // 95% > 80%
      l2.setCurrentUsage(60); // 60% <= 80%

      const congested = congestionService.detectCongestedLinks();
      expect(congested.length).toBe(1);
      expect(congested[0].linkId).toBe('L1');
      expect(congested[0].utilization).toBe(0.95);
    });
  });

  describe('MetricsService computations', () => {
    it('should compute router and link metrics', () => {
      const router = network.addRouter('R1', 10);
      const link = network.addLink('L1', 'R1', 'R2', 100, 10);

      router.processPacket(new Packet('P1', 'A', 'B', 100));
      link.setCurrentUsage(50);

      const rMetrics = metricsService.getRouterMetrics('R1');
      expect(rMetrics.queueLength).toBe(1);
      expect(rMetrics.utilization).toBe(0.1);

      const lMetrics = metricsService.getLinkMetrics('L1');
      expect(lMetrics.bandwidthUsage).toBe(50);
      expect(lMetrics.utilization).toBe(0.5);
    });

    it('should compute network metrics (throughput, average latency, loss)', () => {
      // Create some simulated packets with known history
      const p1 = network.createPacket('P1', 'R1', 'R2', 100, 0); // Delivered, latency: 4
      const p2 = network.createPacket('P2', 'R1', 'R2', 100, 1); // Delivered, latency: 2
      const p3 = network.createPacket('P3', 'R1', 'R2', 100, 2); // Dropped

      p1.markDelivered(4);
      p2.markDelivered(3);
      p3.setStatus(Packet.States.DROPPED);

      // Advance clock to simulate 5 ticks
      clock.tick();
      clock.tick();
      clock.tick();
      clock.tick();
      clock.tick(); // time = 5

      const netMetrics = metricsService.getNetworkMetrics();

      // Throughput: 2 delivered / 5 ticks = 0.4 packets/tick
      expect(netMetrics.throughput).toBe(0.4);

      // Packet Loss: 1 dropped / 3 total = 0.3333...
      expect(netMetrics.packetLoss).toBeCloseTo(0.3333);

      // Average Latency: ((4-0) + (3-1)) / 2 = (4 + 2) / 2 = 3
      expect(netMetrics.averageLatency).toBe(3);
    });
  });
});
