/**
 * Dijkstra's Algorithm (Optimized with Min-Heap Priority Queue)
 * Finds the shortest path between two nodes using link latency as weights
 * Time Complexity: O((V + E) log V) where V = routers, E = links
 */
const MinHeap = require('../utils/MinHeap');

const getRouterId = (router) => {
  if (typeof router === 'string') return router;
  if (router && typeof router.getId === 'function') return router.getId();
  if (router && router.id) return router.id;
  return router;
};

const getLinkLatency = (link, topology) => {
  if (!link) return 1;
  if (typeof link.getLatency === 'function') return link.getLatency();
  if (typeof link === 'object' && link.latency !== undefined) return link.latency;
  if (typeof link === 'string') {
    if (topology && typeof topology.getLink === 'function') {
      const resolved = topology.getLink(link);
      if (resolved) {
        return typeof resolved.getLatency === 'function' ? resolved.getLatency() : (resolved.latency || 1);
      }
    }
    if (topology && topology.network && typeof topology.network.getLink === 'function') {
      const resolved = topology.network.getLink(link);
      if (resolved) {
        return typeof resolved.getLatency === 'function' ? resolved.getLatency() : (resolved.latency || 1);
      }
    }
  }
  return 1;
};

class Dijkstra {
  static findShortestPath(topology, source, destination) {
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();

    // Initialize distances
    const allRouters = topology.getAllRouters();
    allRouters.forEach(router => {
      const rId = getRouterId(router);
      if (rId !== undefined && rId !== null) {
        distances.set(rId, Infinity);
        previous.set(rId, null);
      }
    });

    distances.set(source, 0);
    if (!previous.has(source)) {
      previous.set(source, null);
    }

    // Min-heap: stores elements as { id, distance }
    const pq = new MinHeap((a, b) => a.distance - b.distance);
    pq.push({ id: source, distance: 0 });

    while (!pq.isEmpty()) {
      const { id: current } = pq.pop();

      if (visited.has(current)) continue;
      if (current === destination) break;

      visited.add(current);

      const neighbors = topology.getNeighbors(current);
      for (const { router: neighbor, link } of neighbors) {
        if (!visited.has(neighbor)) {
          // Use link latency as the weight
          const linkLatency = getLinkLatency(link, topology);
          const currentDist = distances.has(current) ? distances.get(current) : Infinity;
          const newDistance = currentDist + linkLatency;
          
          const neighborDist = distances.has(neighbor) ? distances.get(neighbor) : Infinity;
          if (newDistance < neighborDist) {
            distances.set(neighbor, newDistance);
            previous.set(neighbor, current);
            pq.push({ id: neighbor, distance: newDistance });
          }
        }
      }
    }

    // Reconstruct path
    const path = [];
    let current = destination;

    while (current !== null && current !== undefined) {
      path.unshift(current);
      current = previous.get(current);
    }

    const destDist = distances.has(destination) ? distances.get(destination) : Infinity;
    return {
      path: path[0] === source ? path : null,
      distance: destDist,
      found: destDist !== Infinity
    };
  }
}

module.exports = Dijkstra;

