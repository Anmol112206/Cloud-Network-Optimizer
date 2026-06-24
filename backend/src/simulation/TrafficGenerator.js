/**
 * Traffic Generator
 * Periodically generates traffic packets between network routers on clock ticks
 */
class TrafficGenerator {
  constructor(network, clock, options = {}) {
    this.network = network;
    this.clock = clock;
    this.options = {
      packetRate: options.packetRate !== undefined ? options.packetRate : Number(process.env.DEFAULT_PACKET_RATE || 1.5),
      packetSizeMin: options.packetSizeMin || Number(process.env.DEFAULT_PACKET_SIZE_MIN || 64),
      packetSizeMax: options.packetSizeMax || Number(process.env.DEFAULT_PACKET_SIZE_MAX || 1500),
      enabled: options.enabled !== false,
      source: options.source || null,
      destination: options.destination || null,
      ...options
    };

    // Initialize list of concurrent traffic streams
    this.streams = [];
    if (options && (options.packetRate !== undefined || options.source !== undefined || options.destination !== undefined)) {
      this.streams.push({
        id: options.id || 'default-stream',
        packetRate: this.options.packetRate,
        packetSizeMin: this.options.packetSizeMin,
        packetSizeMax: this.options.packetSizeMax,
        enabled: true,
        source: this.options.source,
        destination: this.options.destination
      });
    }

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

    for (const stream of this.streams) {
      if (!stream.enabled) continue;

      const rate = stream.packetRate;
      let countToGenerate = 0;
      if (rate >= 1) {
        countToGenerate = Math.floor(rate);
      } else {
        if (Math.random() < rate) {
          countToGenerate = 1;
        }
      }

      for (let i = 0; i < countToGenerate; i++) {
        let source = stream.source;
        let destination = stream.destination;

        if (!source || !routers.includes(source)) {
          const srcIdx = Math.floor(Math.random() * routers.length);
          source = routers[srcIdx];
        }

        if (!destination || !routers.includes(destination) || destination === source) {
          let dstIdx = Math.floor(Math.random() * routers.length);
          while (routers[dstIdx] === source) {
            dstIdx = Math.floor(Math.random() * routers.length);
          }
          destination = routers[dstIdx];
        }

        const size = Math.floor(
          Math.random() * (stream.packetSizeMax - stream.packetSizeMin + 1) + 
          stream.packetSizeMin
        );

        this.generatedCount++;
        const packetId = `P-GEN-${this.generatedCount}-${this.clock ? this.clock.getCurrentTime() : 'NOCLOCK'}`;
        const virtualTime = this.clock ? this.clock.getCurrentTime() : Date.now();
        const packet = this.network.createPacket(packetId, source, destination, size, virtualTime);
        generatedPackets.push(packet);
      }
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
