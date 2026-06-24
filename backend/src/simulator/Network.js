/**
 * Network Simulator
 * Core simulation engine orchestrating routers, links, and packets
 */
const Router = require('../domain/entities/Router');
const Link = require('../domain/entities/Link');
const Packet = require('../domain/entities/Packet');

class Network {
  constructor() {
    this.routers = new Map();
    this.links = new Map();
    this.packets = [];
    this.time = 0;
  }

  addRouter(id, capacity, processingRate = 1) {
    const router = new Router(id, capacity, processingRate);
    this.routers.set(id, router);
    return router;
  }

  addLink(id, sourceId, targetId, bandwidth, latency) {
    const link = new Link(id, sourceId, targetId, bandwidth, latency);
    this.links.set(id, link);
    return link;
  }

  createPacket(id, source, destination, size, createdAt) {
    const packet = new Packet(id, source, destination, size);
    if (createdAt !== undefined) {
      packet.createdAt = createdAt;
    }
    this.packets.push(packet);
    return packet;
  }

  getNetworkStats() {
    const routerStats = Array.from(this.routers.values()).map(r => ({
      id: r.getId(),
      load: r.getLoad(),
      queueLength: r.getQueueLength(),
      capacity: r.getCapacity(),
      processingRate: r.getProcessingRate()
    }));

    const linkStats = Array.from(this.links.values()).map(l => ({
      id: l.getId(),
      source: l.getSource(),
      target: l.getTarget(),
      utilization: l.getUtilization(),
      load: l.getLoad(),
      bandwidth: l.getBandwidth(),
      latency: l.getLatency()
    }));

    return {
      totalPackets: this.packets.length,
      totalRouters: this.routers.size,
      totalLinks: this.links.size,
      routers: routerStats,
      links: linkStats,
      time: this.time
    };
  }

  getRouter(id) {
    return this.routers.get(id);
  }

  getLink(id) {
    return this.links.get(id);
  }

  getPackets() {
    return this.packets;
  }

  clear() {
    this.routers.clear();
    this.links.clear();
    this.packets = [];
    this.time = 0;
  }

  tick() {
    this.time++;
  }
}

module.exports = Network;
