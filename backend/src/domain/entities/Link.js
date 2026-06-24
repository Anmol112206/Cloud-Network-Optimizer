/**
 * Link Entity
 * Represents a network link (connection) in the domain model
 */
class Link {
  constructor(id, sourceId, targetId, bandwidth, latency) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.bandwidth = bandwidth; // MBpt
    this.latency = latency;     // ms
    this.packets = [];
    this.currentUsage = 0;      // MBpt
    this.createdAt = new Date();
  }

  transmit(packet) {
    this.packets.push(packet);
  }

  getUtilization() {
    if (this.currentUsage > 0) {
      return this.bandwidth > 0 ? this.currentUsage / this.bandwidth : 0;
    }
    // Calculate actual bandwidth usage based on the sizes of packets in transit
    const totalBytes = this.packets.reduce((sum, p) => sum + (p.getSize ? p.getSize() : (p.size || 0)), 0);
    const activeUsage = totalBytes / 1000000; // Bytes to Megabytes (10^6 Bytes per Megabyte)
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
