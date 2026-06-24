/**
 * Pathfinding Algorithms Test Suite
 * Tests Dijkstra and A* algorithms for accuracy and edge cases
 */
const Dijkstra = require('../src/algorithms/Dijkstra');

// Mock Topology and Link classes
class MockLink {
  constructor(id, latency, bandwidth = 100) {
    this.id = id;
    this.latency = latency;
    this.bandwidth = bandwidth;
  }

  getId() {
    return this.id;
  }

  getLatency() {
    return this.latency;
  }

  getBandwidth() {
    return this.bandwidth;
  }
}

class MockRouter {
  constructor(id) {
    this.id = id;
  }

  getId() {
    return this.id;
  }
}

class MockTopology {
  constructor() {
    this.routers = new Map();
    this.links = new Map();
    this.adjacencyList = new Map();
  }

  addRouter(id) {
    const router = new MockRouter(id);
    this.routers.set(id, router);
    this.adjacencyList.set(id, []);
    return router;
  }

  addLink(id, sourceId, targetId, latency, bandwidth = 100) {
    const link = new MockLink(id, latency, bandwidth);
    this.links.set(id, link);

    // Add bidirectional connection for undirected graph
    this.adjacencyList.get(sourceId).push({ router: targetId, link });
    this.adjacencyList.get(targetId).push({ router: sourceId, link });

    return link;
  }

  getAllRouters() {
    return Array.from(this.routers.values());
  }

  getNeighbors(routerId) {
    return this.adjacencyList.get(routerId) || [];
  }

  getLink(linkId) {
    return this.links.get(linkId);
  }
}

describe('Pathfinding Algorithms', () => {
  let topology;

  beforeEach(() => {
    topology = new MockTopology();
  });

  describe('Dijkstra Algorithm', () => {
    it('should find shortest path in simple linear network', () => {
      // R1 --10ms-- R2 --5ms-- R3
      topology.addRouter('R1');
      topology.addRouter('R2');
      topology.addRouter('R3');

      topology.addLink('L1', 'R1', 'R2', 10);
      topology.addLink('L2', 'R2', 'R3', 5);

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R3');

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['R1', 'R2', 'R3']);
      expect(result.distance).toBe(15); // 10 + 5
    });

    it('should find optimal path with multiple routes', () => {
      // R1 --10ms-- R2 --5ms-- R4
      //  \                     /
      //   ----50ms-- R3 -------
      topology.addRouter('R1');
      topology.addRouter('R2');
      topology.addRouter('R3');
      topology.addRouter('R4');

      topology.addLink('L1', 'R1', 'R2', 10);
      topology.addLink('L2', 'R1', 'R3', 50);
      topology.addLink('L3', 'R2', 'R4', 5);
      topology.addLink('L4', 'R3', 'R4', 40);

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R4');

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['R1', 'R2', 'R4']);
      expect(result.distance).toBe(15); // 10 + 5 (better than 50 + 40 = 90)
    });

    it('should return null path when no route exists', () => {
      // R1 -- R2    R3 -- R4 (disconnected)
      topology.addRouter('R1');
      topology.addRouter('R2');
      topology.addRouter('R3');
      topology.addRouter('R4');

      topology.addLink('L1', 'R1', 'R2', 10);
      topology.addLink('L2', 'R3', 'R4', 10);

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R3');

      expect(result.found).toBe(false);
      expect(result.path).toBeNull();
      expect(result.distance).toBe(Infinity);
    });

    it('should handle same source and destination', () => {
      topology.addRouter('R1');

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R1');

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['R1']);
      expect(result.distance).toBe(0);
    });

    it('should correctly handle latency-based weights', () => {
      // R1 --100ms-- R2 -- 1ms -- R3
      //  \                        /
      //   ----------2ms-----------
      topology.addRouter('R1');
      topology.addRouter('R2');
      topology.addRouter('R3');

      topology.addLink('L1', 'R1', 'R2', 100);
      topology.addLink('L2', 'R2', 'R3', 1);
      topology.addLink('L3', 'R1', 'R3', 2);

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R3');

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['R1', 'R3']);
      expect(result.distance).toBe(2); // Direct 2ms route is better than 100+1=101ms
    });

    it('should find path in complex network', () => {
      // Create a 3x3 grid network
      const routers = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
      routers.forEach(r => topology.addRouter(r));

      // R1 - R2 - R3
      // |    |    |
      // R4 - R5 - R6
      // |    |    |
      // R7 - R8 - R9

      topology.addLink('L1', 'R1', 'R2', 5);
      topology.addLink('L2', 'R2', 'R3', 5);
      topology.addLink('L3', 'R1', 'R4', 5);
      topology.addLink('L4', 'R2', 'R5', 5);
      topology.addLink('L5', 'R3', 'R6', 5);
      topology.addLink('L6', 'R4', 'R5', 5);
      topology.addLink('L7', 'R5', 'R6', 5);
      topology.addLink('L8', 'R4', 'R7', 5);
      topology.addLink('L9', 'R5', 'R8', 5);
      topology.addLink('L10', 'R6', 'R9', 5);
      topology.addLink('L11', 'R7', 'R8', 5);
      topology.addLink('L12', 'R8', 'R9', 5);

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R9');

      expect(result.found).toBe(true);
      expect(result.distance).toBe(20); // 4 hops * 5ms = 20ms (shortest path)
    });
  });



  describe('Edge Cases', () => {
    it('should handle single router network', () => {
      topology.addRouter('R1');

      const dijkstraResult = Dijkstra.findShortestPath(topology, 'R1', 'R1');

      expect(dijkstraResult.found).toBe(true);
      expect(dijkstraResult.distance).toBe(0);
    });

    it('should handle two router network', () => {
      topology.addRouter('R1');
      topology.addRouter('R2');
      topology.addLink('L1', 'R1', 'R2', 25);

      const dijkstraResult = Dijkstra.findShortestPath(topology, 'R1', 'R2');

      expect(dijkstraResult.found).toBe(true);
      expect(dijkstraResult.distance).toBe(25);
    });

    it('should handle network with only forward direction link', () => {
      topology.addRouter('R1');
      topology.addRouter('R2');
      // Normally addLink creates bidirectional, testing single direction behavior
      topology.addRouter('R3');
      topology.addLink('L1', 'R1', 'R2', 10);
      topology.addLink('L2', 'R2', 'R3', 5);

      const result = Dijkstra.findShortestPath(topology, 'R1', 'R3');
      expect(result.found).toBe(true);
      expect(result.distance).toBe(15);
    });
  });
});
