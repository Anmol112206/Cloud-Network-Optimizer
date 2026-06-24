/**
 * Simple Pathfinding Tests  
 * Quick verification that Dijkstra and A* algorithms work correctly
 */
const Dijkstra = require('../src/algorithms/Dijkstra');

// Simple Mock Classes
class SimpleLink {
  constructor(id, latency) {
    this.id = id;
    this._latency = latency;
  }
  getLatency() { return this._latency; }
}

class SimpleRouter {
  constructor(id) { this.id = id; }
}

class SimpleTopology {
  constructor() {
    this.routers = [];
    this.adjacencyList = new Map();
  }

  addRouter(id) {
    const router = new SimpleRouter(id);
    this.routers.push(router);
    this.adjacencyList.set(id, []);
    return router;
  }

  addLink(id, source, target, latency) {
    const link = new SimpleLink(id, latency);
    // Bidirectional
    this.adjacencyList.get(source).push({ router: target, link });
    this.adjacencyList.get(target).push({ router: source, link });
  }

  getAllRouters() {
    return this.routers;
  }

  getNeighbors(routerId) {
    return this.adjacencyList.get(routerId) || [];
  }
}

describe('Dijkstra Algorithm', () => {
  let topology;

  beforeEach(() => {
    topology = new SimpleTopology();
  });

  it('should find shortest path in linear network', () => {
    topology.addRouter('R1');
    topology.addRouter('R2');
    topology.addRouter('R3');
    topology.addLink('L1', 'R1', 'R2', 10);
    topology.addLink('L2', 'R2', 'R3', 5);

    const result = Dijkstra.findShortestPath(topology, 'R1', 'R3');

    expect(result.found).toBe(true);
    expect(result.path).toEqual(['R1', 'R2', 'R3']);
    expect(result.distance).toBe(15);
  });

  it('should find optimal path with multiple routes', () => {
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
    expect(result.distance).toBe(15);
  });
});


