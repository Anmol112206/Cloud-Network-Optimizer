/**
 * Link Entity
 * Represents a network link (connection) in the domain model
 */
class Link {
  constructor(id, sourceId, targetId, bandwidth, latency) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.bandwidth = bandwidth; // Mbps
    this.latency = latency;     // ms
    this.packets = [];
    this.currentUsage = 0;      // Mbps
    this.createdAt = new Date();
  }

  transmit(packet) {
    this.packets.push(packet);
  }

  getUtilization() {
    if (this.currentUsage > 0) {
      return this.bandwidth > 0 ? this.currentUsage / this.bandwidth : 0;
    }
    // Fallback: estimate usage based on packets in transit (e.g. 10 Mbps per packet)
    const activeUsage = this.packets.length * 10;
    return this.bandwidth > 0 ? activeUsage / this.bandwidth : 0;
  }

  setCurrentUsage(usage) {
    this.currentUsage = usage;
  }

  getId() {
    return this.id;
  }

  getSource() {
    return this.sourceId;
  }

  getTarget() {
    return this.targetId;
  }

  getBandwidth() {
    return this.bandwidth;
  }

  getLatency() {
    return this.latency;
  }

  getLoad() {
    return this.getUtilization() * 100;
  }
}


module.exports = Link;
