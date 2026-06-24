/**
 * Routing Service
 * Handles routing decisions and path computation
 */
const Dijkstra = require('../algorithms/Dijkstra');

class RoutingService {
  constructor(network, topology) {
    this.network = network;
    this.topology = topology;
    this.routingCache = new Map();
  }

  computeRoute(source, destination) {
    const cacheKey = `${source}-${destination}`;
    
    if (this.routingCache.has(cacheKey)) {
      return this.routingCache.get(cacheKey);
    }

    const route = Dijkstra.findShortestPath(this.topology, source, destination);

    if (route.found) {
      this.routingCache.set(cacheKey, route);
    }

    return route;
  }

  routePacket(packet) {
    const route = this.computeRoute(packet.getSource(), packet.getDestination());

    if (!route.found) {
      packet.setStatus('UNREACHABLE');
      return false;
    }

    packet.addToPath(packet.getSource());
    
    for (let i = 1; i < route.path.length; i++) {
      packet.addToPath(route.path[i]);
    }

    packet.setStatus('ROUTED');
    return true;
  }

  invalidateCache(source, destination) {
    const cacheKey = `${source}-${destination}`;
    this.routingCache.delete(cacheKey);
  }

  clearCache() {
    this.routingCache.clear();
  }

  getRouteMetrics(source, destination) {
    const cacheKey = `${source}-${destination}`;
    
    // Check cache first
    if (this.routingCache.has(cacheKey)) {
      const route = this.routingCache.get(cacheKey);
      return this._calculateRouteMetrics(route);
    }
    
    // If not cached, compute and cache
    const route = this.computeRoute(source, destination);
    return this._calculateRouteMetrics(route);
  }

  _calculateRouteMetrics(route) {
    if (!route.found) {
      return null;
    }

    let minBandwidth = Infinity;

    for (let i = 0; i < route.path.length - 1; i++) {
      const srcRouter = route.path[i];
      const dstRouter = route.path[i + 1];

      // Find link between these routers
      const neighbors = this.topology.getNeighbors(srcRouter);
      const linkId = neighbors.find(n => n.router === dstRouter)?.link;

      if (linkId) {
        const link = this.network.getLink(linkId);
        minBandwidth = Math.min(minBandwidth, link.getBandwidth());
      }
    }

    return {
      hops: route.path.length - 1,
      latency: route.distance,
      bandwidth: minBandwidth === Infinity ? 0 : minBandwidth
    };
  }
}

module.exports = RoutingService;
