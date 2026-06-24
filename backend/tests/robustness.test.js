const Dijkstra = require('../src/algorithms/Dijkstra');

describe('Pathfinding Robustness and Types Compatibility', () => {
  
  // 1. Topology using mixed representations: Router objects (some with getId(), some with .id) and strings
  class MixedRouterA {
    constructor(id) { this._id = id; }
    getId() { return this._id; }
  }

  class MixedRouterB {
    constructor(id) { this.id = id; }
  }

  class MixedTopology {
    constructor() {
      this.routers = [];
      this.adjacencyList = new Map();
      this.links = new Map();
    }

    addRouter(router) {
      this.routers.push(router);
      const id = typeof router === 'string' ? router : (router.getId ? router.getId() : router.id);
      this.adjacencyList.set(id, []);
    }

    addLink(id, source, target, latency) {
      // Store link as string in adjacency list
      this.links.set(id, { getLatency: () => latency });
      this.adjacencyList.get(source).push({ router: target, link: id });
      this.adjacencyList.get(target).push({ router: source, link: id });
    }

    getAllRouters() {
      return this.routers;
    }

    getNeighbors(routerId) {
      return this.adjacencyList.get(routerId) || [];
    }

    getLink(linkId) {
      return this.links.get(linkId);
    }
  }

  let mixedTopology;

  beforeEach(() => {
    mixedTopology = new MixedTopology();
  });

  it('should find path when routers are mixed objects/strings and links are string IDs', () => {
    // R1 (MixedRouterA) --5ms-- R2 (string) --10ms-- R3 (MixedRouterB)
    mixedTopology.addRouter(new MixedRouterA('R1'));
    mixedTopology.addRouter('R2');
    mixedTopology.addRouter(new MixedRouterB('R3'));

    mixedTopology.addLink('L1', 'R1', 'R2', 5);
    mixedTopology.addLink('L2', 'R2', 'R3', 10);

    // Test Dijkstra
    const dijkstraResult = Dijkstra.findShortestPath(mixedTopology, 'R1', 'R3');
    expect(dijkstraResult.found).toBe(true);
    expect(dijkstraResult.path).toEqual(['R1', 'R2', 'R3']);
    expect(dijkstraResult.distance).toBe(15);


  });

  // 2. Topology where link is string ID resolved via topology.network.getLink
  class NetworkAdjacencyTopology {
    constructor() {
      this.routers = ['R1', 'R2'];
      this.adjacency = new Map([
        ['R1', [{ router: 'R2', link: 'L1' }]],
        ['R2', [{ router: 'R1', link: 'L1' }]]
      ]);
      this.network = {
        getLink: (id) => {
          if (id === 'L1') return { latency: 25 };
          return null;
        }
      };
    }

    getAllRouters() {
      return this.routers;
    }

    getNeighbors(routerId) {
      return this.adjacency.get(routerId) || [];
    }
  }

  it('should resolve link latency through topology.network when link is string ID', () => {
    const topo = new NetworkAdjacencyTopology();

    const dijkstraResult = Dijkstra.findShortestPath(topo, 'R1', 'R2');
    expect(dijkstraResult.found).toBe(true);
    expect(dijkstraResult.distance).toBe(25);


  });

  // 3. Dynamic nodes missing from allRouters initially
  class IncompleteTopology {
    constructor() {
      this.adjacency = new Map([
        ['R1', [{ router: 'R2', link: { latency: 8 } }]]
      ]);
    }

    getAllRouters() {
      return []; // empty list of routers initially
    }

    getNeighbors(routerId) {
      return this.adjacency.get(routerId) || [];
    }
  }

  it('should handle dynamically discovered neighbors not in allRouters list', () => {
    const topo = new IncompleteTopology();

    const dijkstraResult = Dijkstra.findShortestPath(topo, 'R1', 'R2');
    expect(dijkstraResult.found).toBe(true);
    expect(dijkstraResult.path).toEqual(['R1', 'R2']);
    expect(dijkstraResult.distance).toBe(8);


  });
});
