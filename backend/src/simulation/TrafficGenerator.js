/**
 * Traffic Generator
 * Periodically generates traffic packets between network routers on clock ticks
 */
class TrafficGenerator {
  constructor(network, clock, options = {}) {
    this.network = network;
    this.clock = clock;
    this.options = {
      packetRate: options.packetRate !== undefined ? options.packetRate : 0.5, // Probability of packet per tick (if < 1) or fixed count (if >= 1)
      packetSizeMin: options.packetSizeMin || 64,
      packetSizeMax: options.packetSizeMax || 1500,
      enabled: options.enabled !== false,
      source: options.source || null,
      destination: options.destination || null,
      ...options
    };
    this.generatedCount = 0;

    // Register with clock
    if (this.clock) {
      this.unsubscribe = this.clock.onTick(() => this.generateTraffic());
    }
  }

  generateTraffic() {
    if (!this.options.enabled) return [];

    const routers = Array.from(this.network.routers.keys());
    if (routers.length < 2) return [];

    const generatedPackets = [];
    const rate = this.options.packetRate;
    
    // Determine number of packets to generate this tick
    let countToGenerate = 0;
    if (rate >= 1) {
      countToGenerate = Math.floor(rate);
    } else {
      // Use random probability
      if (Math.random() < rate) {
        countToGenerate = 1;
      }
    }

    for (let i = 0; i < countToGenerate; i++) {
      let source = this.options.source;
      let destination = this.options.destination;

      // Select source: use custom if valid and exists in network, otherwise random
      if (!source || !routers.includes(source)) {
        const srcIdx = Math.floor(Math.random() * routers.length);
        source = routers[srcIdx];
      }

      // Select destination: use custom if valid, exists in network, and is not equal to source
      if (!destination || !routers.includes(destination) || destination === source) {
        let dstIdx = Math.floor(Math.random() * routers.length);
        while (routers[dstIdx] === source) {
          dstIdx = Math.floor(Math.random() * routers.length);
        }
        destination = routers[dstIdx];
      }

      const size = Math.floor(
        Math.random() * (this.options.packetSizeMax - this.options.packetSizeMin + 1) + 
        this.options.packetSizeMin
      );

      this.generatedCount++;
      const packetId = `P-GEN-${this.generatedCount}-${this.clock ? this.clock.getCurrentTime() : 'NOCLOCK'}`;
      
      // Pass the current virtual clock time as createdAt
      const virtualTime = this.clock ? this.clock.getCurrentTime() : Date.now();
      const packet = this.network.createPacket(packetId, source, destination, size, virtualTime);
      generatedPackets.push(packet);
    }

    return generatedPackets;
  }

  stop() {
    this.options.enabled = false;
  }

  start() {
    this.options.enabled = true;
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

module.exports = TrafficGenerator;
