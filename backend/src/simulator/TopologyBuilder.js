/**
 * Topology Builder
 * Constructs and manages network topology structure
 */
class TopologyBuilder {
  constructor(network) {
    this.network = network;
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
  }

  addConnection(routerA, routerB, linkId) {
    if (!this.adjacencyList.has(routerA)) {
      this.adjacencyList.set(routerA, []);
    }
    if (!this.reverseAdjacencyList.has(routerB)) {
      this.reverseAdjacencyList.set(routerB, []);
    }
    
    this.adjacencyList.get(routerA).push({ router: routerB, link: linkId });
    this.reverseAdjacencyList.get(routerB).push({ router: routerA, link: linkId });
  }

  removeConnection(routerA, routerB) {
    if (this.adjacencyList.has(routerA)) {
      this.adjacencyList.set(
        routerA,
        this.adjacencyList.get(routerA).filter(conn => conn.router !== routerB)
      );
    }
    if (this.reverseAdjacencyList.has(routerB)) {
      this.reverseAdjacencyList.set(
        routerB,
        this.reverseAdjacencyList.get(routerB).filter(conn => conn.router !== routerA)
      );
    }
    
    // Links are bidirectional in the simulator, so remove both directions
    if (this.adjacencyList.has(routerB)) {
      this.adjacencyList.set(
        routerB,
        this.adjacencyList.get(routerB).filter(conn => conn.router !== routerA)
      );
    }
    if (this.reverseAdjacencyList.has(routerA)) {
      this.reverseAdjacencyList.set(
        routerA,
        this.reverseAdjacencyList.get(routerA).filter(conn => conn.router !== routerB)
      );
    }
  }

  getNeighbors(routerId) {
    return this.adjacencyList.get(routerId) || [];
  }

  getIncomingNeighbors(routerId) {
    return this.reverseAdjacencyList.get(routerId) || [];
  }

  getTopology() {
    return Object.fromEntries(this.adjacencyList);
  }

  getAllRouters() {
    return Array.from(this.adjacencyList.keys());
  }

  validateTopology() {
    for (const [router, neighbors] of this.adjacencyList.entries()) {
      if (!this.network.getRouter(router)) {
        throw new Error(`Router ${router} not found in network`);
      }
      for (const { router: neighbor, link: linkId } of neighbors) {
        if (!this.network.getRouter(neighbor)) {
          throw new Error(`Neighbor ${neighbor} not found in network`);
        }
        if (!this.network.getLink(linkId)) {
          throw new Error(`Link ${linkId} not found in network`);
        }
      }
    }
    return true;
  }

  clear() {
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }
}

module.exports = TopologyBuilder;
