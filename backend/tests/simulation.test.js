const Network = require('../src/simulator/Network');
const Router = require('../src/domain/entities/Router');
const Link = require('../src/domain/entities/Link');
const Packet = require('../src/domain/entities/Packet');
const RoutingService = require('../src/services/RoutingService');
const TopologyBuilder = require('../src/simulator/TopologyBuilder');

const SimulationClock = require('../src/simulation/SimulationClock');
const TrafficGenerator = require('../src/simulation/TrafficGenerator');
const PacketSimulator = require('../src/simulation/PacketSimulator');

describe('Simulation Engine Suite', () => {
  let network;
  let topology;
  let routingService;
  let clock;

  beforeEach(() => {
    network = new Network();
    topology = new TopologyBuilder(network);
    routingService = new RoutingService(network, topology);
    clock = new SimulationClock();
  });

  describe('SimulationClock', () => {
    it('should increment time on tick', () => {
      expect(clock.getCurrentTime()).toBe(0);
      clock.tick();
      expect(clock.getCurrentTime()).toBe(1);
      clock.tick();
      expect(clock.getCurrentTime()).toBe(2);
    });

    it('should notify subscribers on tick', () => {
      let tickCount = 0;
      clock.onTick((time) => {
        tickCount = time;
      });

      clock.tick();
      expect(tickCount).toBe(1);
      clock.tick();
      expect(tickCount).toBe(2);
    });

    it('should allow unsubscribing from tick events', () => {
      let tickCount = 0;
      const unsubscribe = clock.onTick((time) => {
        tickCount = time;
      });

      clock.tick();
      expect(tickCount).toBe(1);

      unsubscribe();
      clock.tick();
      expect(tickCount).toBe(1); // Should not update further
    });

    it('should reset clock successfully', () => {
      clock.tick();
      clock.tick();
      expect(clock.getCurrentTime()).toBe(2);
      clock.reset();
      expect(clock.getCurrentTime()).toBe(0);
    });
  });

  describe('TrafficGenerator', () => {
    beforeEach(() => {
      network.addRouter('R1', 10);
      network.addRouter('R2', 10);
    });

    it('should generate traffic on ticks when enabled', () => {
      const generator = new TrafficGenerator(network, clock, {
        packetRate: 1, // Fixed 1 packet per tick
        packetSizeMin: 100,
        packetSizeMax: 200
      });

      expect(network.getPackets().length).toBe(0);
      clock.tick();
      expect(network.getPackets().length).toBe(1);
      
      const packet = network.getPackets()[0];
      expect(packet.getStatus()).toBe(Packet.States.CREATED);
      expect(packet.getSize()).toBeGreaterThanOrEqual(100);
      expect(packet.getSize()).toBeLessThanOrEqual(200);

      clock.tick();
      expect(network.getPackets().length).toBe(2);

      generator.cleanup();
    });

    it('should not generate traffic when disabled', () => {
      const generator = new TrafficGenerator(network, clock, {
        packetRate: 1,
        enabled: false
      });

      clock.tick();
      expect(network.getPackets().length).toBe(0);

      generator.start();
      clock.tick();
      expect(network.getPackets().length).toBe(1);

      generator.stop();
      clock.tick();
      expect(network.getPackets().length).toBe(1); // Still 1

      generator.cleanup();
    });

    it('should generate traffic on a specific route when source and destination options are set', () => {
      const generator = new TrafficGenerator(network, clock, {
        packetRate: 1,
        source: 'R1',
        destination: 'R2'
      });

      clock.tick();
      expect(network.getPackets().length).toBe(1);
      
      const packet = network.getPackets()[0];
      expect(packet.getSource()).toBe('R1');
      expect(packet.getDestination()).toBe('R2');

      generator.cleanup();
    });

    it('should fall back to random nodes if specified source/destination does not exist in network', () => {
      const generator = new TrafficGenerator(network, clock, {
        packetRate: 1,
        source: 'NON_EXISTENT_R1',
        destination: 'NON_EXISTENT_R2'
      });

      clock.tick();
      expect(network.getPackets().length).toBe(1);
      
      const packet = network.getPackets()[0];
      expect(['R1', 'R2']).toContain(packet.getSource());
      expect(['R1', 'R2']).toContain(packet.getDestination());
      expect(packet.getSource()).not.toBe(packet.getDestination());

      generator.cleanup();
    });
  });

  describe('PacketSimulator & State Transitions', () => {
    let simulator;

    beforeEach(() => {
      // Setup network topology
      // R1 (cap: 5) --(L1: 2ms/ticks)-- R2 (cap: 5) --(L2: 3ms/ticks)-- R3 (cap: 5)
      network.addRouter('R1', 5);
      network.addRouter('R2', 5);
      network.addRouter('R3', 5);

      network.addLink('L1', 'R1', 'R2', 1000, 2); // 2 ticks latency
      network.addLink('L2', 'R2', 'R3', 1000, 3); // 3 ticks latency

      // Build connections in topology
      topology.addConnection('R1', 'R2', 'L1');
      topology.addConnection('R2', 'R3', 'L2');

      simulator = new PacketSimulator(network, clock, routingService);
    });

    afterEach(() => {
      simulator.cleanup();
    });

    it('should successfully route, transmit and deliver a packet', () => {
      // Create and route packet: R1 -> R3
      const packet = network.createPacket('P1', 'R1', 'R3', 512, clock.getCurrentTime());
      expect(packet.getStatus()).toBe(Packet.States.CREATED);
      expect(packet.currentHop).toBe(0);

      // Route packet using RoutingService
      const routed = routingService.routePacket(packet);
      expect(routed).toBe(true);
      expect(packet.getStatus()).toBe(Packet.States.ROUTED);
      expect(packet.getPath()).toEqual(['R1', 'R2', 'R3']);

      // Tick 1:
      // - Packet is initialized into R1 queue (during step 1)
      // - Router R1 queue is drained and packet starts transmission on Link L1 (2 ticks latency)
      // - Status changes to IN_TRANSIT
      clock.tick();
      expect(packet.getStatus()).toBe(Packet.States.IN_TRANSIT);
      expect(packet.currentHop).toBe(0); // Still at hop 0 (R1) in path
      expect(network.getLink('L1').packets.length).toBe(1);

      // Tick 2:
      // - Link transit ticks decrement: remaining goes from 2 -> 1 -> 0.
      // - Wait, let's track execution:
      //   - Tick 1: state.ticksRemaining initialized to 2.
      //     - But wait! During step() in Tick 1:
      //       - Link propagation sees currentLinkId is null (as activeTransits is empty).
      //       - Router R1 queue is drained, link.transmit is called, and activeTransits is populated with ticksRemaining: 2.
      //       - So at the end of Tick 1, ticksRemaining is 2.
      //   - Tick 2:
      //     - Link propagation sees ticksRemaining: 2 -> decremented to 1. Since 1 is not <= 0, nothing else happens.
      //     - Router drains are empty.
      //     - So packet is still on Link L1.
      clock.tick();
      expect(packet.getStatus()).toBe(Packet.States.IN_TRANSIT);
      expect(packet.currentHop).toBe(0);

      // Tick 3:
      //   - Link propagation: ticksRemaining: 1 -> decremented to 0.
      //     - Arrives at R2 router!
      //     - packet.currentHop increments to 1 (pointing to 'R2').
      //     - Router R2 is not destination, so packet is queued in R2 queue.
      //     - Status set to ROUTED.
      //   - Router R2 queue is drained!
      //     - Next hop is 'R3' (index 2 in path).
      //     - Placed on Link L2 (3 ticks latency).
      //     - Status set to IN_TRANSIT.
      //     - Added to activeTransits with ticksRemaining: 3.
      clock.tick();
      expect(packet.getStatus()).toBe(Packet.States.IN_TRANSIT);
      expect(packet.currentHop).toBe(1); // Now at hop 1 (R2)
      expect(network.getLink('L1').packets.length).toBe(0);
      expect(network.getLink('L2').packets.length).toBe(1);

      // Tick 4: Link L2 remaining: 3 -> decremented to 2.
      clock.tick();
      expect(packet.getStatus()).toBe(Packet.States.IN_TRANSIT);

      // Tick 5: Link L2 remaining: 2 -> decremented to 1.
      clock.tick();
      expect(packet.getStatus()).toBe(Packet.States.IN_TRANSIT);

      // Tick 6:
      //   - Link propagation: ticksRemaining: 1 -> decremented to 0.
      //     - Arrives at R3 router!
      //     - packet.currentHop increments to 2 (pointing to 'R3').
      //     - R3 is destination router!
      //     - markDelivered() is called. Status set to DELIVERED.
      clock.tick();
      expect(packet.getStatus()).toBe(Packet.States.DELIVERED);
      expect(packet.currentHop).toBe(2); // Destination hop reached
      expect(packet.getDeliveryTime()).toBe(6); // Created at 0, delivered at 6
      expect(network.getLink('L2').packets.length).toBe(0);
    });

    it('should drop packet when router queue capacity is exceeded', () => {
      // Set R2 queue capacity to 0 to force drop
      network.addRouter('R2', 0); // Re-add/overwrite R2 with capacity 0

      const packet1 = network.createPacket('P-DRP-1', 'R1', 'R3', 512, clock.getCurrentTime());
      routingService.routePacket(packet1);

      // Tick 1: Starts transiting L1 (remaining: 2)
      clock.tick();
      expect(packet1.getStatus()).toBe(Packet.States.IN_TRANSIT);

      // Tick 2: On link L1 (remaining: 1)
      clock.tick();

      // Tick 3: Finishes L1 transit, attempts to queue at R2. Since R2 capacity is 0, it drops.
      clock.tick();
      expect(packet1.getStatus()).toBe(Packet.States.DROPPED);
    });

    it('should respect router processing rate and build queue when incoming rate exceeds processing rate', () => {
      // Configure R2 processing rate to 1, capacity to 3, and R1/R3 to high processing rate (e.g. 5)
      network.addRouter('R1', 10, 5);
      network.addRouter('R2', 3, 1); // capacity 3, processing rate 1
      network.addRouter('R3', 10, 5);

      // We have link L1 and L2 (latency 1 tick to make tracking simpler)
      network.addLink('L1', 'R1', 'R2', 1000, 1);
      network.addLink('L2', 'R2', 'R3', 1000, 1);
      topology.addConnection('R1', 'R2', 'L1');
      topology.addConnection('R2', 'R3', 'L2');

      // Send 3 packets from R1 -> R3
      const p1 = network.createPacket('P-RATE-1', 'R1', 'R3', 100, clock.getCurrentTime());
      const p2 = network.createPacket('P-RATE-2', 'R1', 'R3', 100, clock.getCurrentTime());
      const p3 = network.createPacket('P-RATE-3', 'R1', 'R3', 100, clock.getCurrentTime());
      
      routingService.routePacket(p1);
      routingService.routePacket(p2);
      routingService.routePacket(p3);

      // Tick 1: R1 drains all 3 packets (rate = 5) and puts them on link L1 (remaining: 1).
      clock.tick();
      expect(p1.getStatus()).toBe(Packet.States.IN_TRANSIT);
      expect(p2.getStatus()).toBe(Packet.States.IN_TRANSIT);
      expect(p3.getStatus()).toBe(Packet.States.IN_TRANSIT);

      // Tick 2: All 3 packets arrive at R2. 
      // R2 processPacket is called for each. Since R2 capacity is 3, all 3 are queued successfully.
      // Then, R2 queue drains up to its processing rate (which is 1).
      // So p1 is drained and transmitted on L2, while p2 and p3 remain in R2's queue.
      clock.tick();
      expect(p1.getStatus()).toBe(Packet.States.IN_TRANSIT); // on L2 now
      expect(p2.getStatus()).toBe(Packet.States.ROUTED); // queued at R2
      expect(p3.getStatus()).toBe(Packet.States.ROUTED); // queued at R2
      expect(network.getRouter('R2').getQueueLength()).toBe(2);

      // Tick 3:
      // - p1 arrives at R3 (destination) and is delivered.
      // - R2 queue drains up to processing rate (1). p2 is drained and transmitted on L2.
      // - p3 remains in R2's queue.
      clock.tick();
      expect(p1.getStatus()).toBe(Packet.States.DELIVERED);
      expect(p2.getStatus()).toBe(Packet.States.IN_TRANSIT); // on L2
      expect(p3.getStatus()).toBe(Packet.States.ROUTED); // queued at R2
      expect(network.getRouter('R2').getQueueLength()).toBe(1);

      // Tick 4:
      // - p2 delivered.
      // - R2 drains p3 and transmits on L2.
      // - R2 queue is now empty.
      clock.tick();
      expect(p2.getStatus()).toBe(Packet.States.DELIVERED);
      expect(p3.getStatus()).toBe(Packet.States.IN_TRANSIT);
      expect(network.getRouter('R2').getQueueLength()).toBe(0);

      // Tick 5: p3 delivered.
      clock.tick();
      expect(p3.getStatus()).toBe(Packet.States.DELIVERED);
    });
  });
});
