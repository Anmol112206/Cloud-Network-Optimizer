/**
 * Example Test Suite
 * Demonstrates testing structure
 */
const Network = require('../src/simulator/Network');
const Router = require('../src/domain/entities/Router');
const Link = require('../src/domain/entities/Link');
const Packet = require('../src/domain/entities/Packet');

describe('Network Simulator', () => {
  let network;

  beforeEach(() => {
    network = new Network();
  });

  describe('Router Entity', () => {
    it('should create a router with correct properties', () => {
      const router = new Router('R1', 100);
      expect(router.getId()).toBe('R1');
      expect(router.getCapacity()).toBe(100);
      expect(router.getQueueLength()).toBe(0);
    });

    it('should process packets up to capacity', () => {
      const router = new Router('R1', 2);
      const packet1 = new Packet('P1', 'R1', 'R2', 1024);
      const packet2 = new Packet('P2', 'R1', 'R2', 1024);
      const packet3 = new Packet('P3', 'R1', 'R2', 1024);

      expect(router.processPacket(packet1)).toBe(true);
      expect(router.processPacket(packet2)).toBe(true);
      expect(router.processPacket(packet3)).toBe(false);
      expect(router.getQueueLength()).toBe(2);
    });
  });

  describe('Link Entity', () => {
    it('should create a link with correct properties', () => {
      const link = new Link('L1', 'R1', 'R2', 1000, 10);
      expect(link.getId()).toBe('L1');
      expect(link.getSource()).toBe('R1');
      expect(link.getTarget()).toBe('R2');
      expect(link.getBandwidth()).toBe(1000);
      expect(link.getLatency()).toBe(10);
    });
  });

  describe('Packet Entity', () => {
    it('should create a packet with correct properties', () => {
      const packet = new Packet('P1', 'R1', 'R3', 1024);
      expect(packet.getId()).toBe('P1');
      expect(packet.getSource()).toBe('R1');
      expect(packet.getDestination()).toBe('R3');
      expect(packet.getSize()).toBe(1024);
      expect(packet.getStatus()).toBe('CREATED');
    });

    it('should track packet path', () => {
      const packet = new Packet('P1', 'R1', 'R3', 1024);
      packet.addToPath('R1');
      packet.addToPath('R2');
      packet.addToPath('R3');
      expect(packet.getPath()).toEqual(['R1', 'R2', 'R3']);
    });
  });

  describe('Network Simulator', () => {
    it('should manage routers and links', () => {
      network.addRouter('R1', 100);
      network.addRouter('R2', 100);
      network.addLink('L1', 'R1', 'R2', 1000, 10);

      expect(network.getRouter('R1')).toBeDefined();
      expect(network.getRouter('R2')).toBeDefined();
      expect(network.getLink('L1')).toBeDefined();
    });

    it('should create packets', () => {
      const packet = network.createPacket('P1', 'R1', 'R3', 1024);
      expect(packet.getId()).toBe('P1');
      expect(network.getPackets().length).toBe(1);
    });

    it('should generate network stats', () => {
      network.addRouter('R1', 100);
      network.addLink('L1', 'R1', 'R2', 1000, 10);
      network.createPacket('P1', 'R1', 'R3', 1024);

      const stats = network.getNetworkStats();
      expect(stats.totalRouters).toBe(1);
      expect(stats.totalLinks).toBe(1);
      expect(stats.totalPackets).toBe(1);
    });
  });
});
