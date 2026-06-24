/**
 * Queue Manager
 * Encapsulates queue operations for network routers, keeping them clean
 */
class QueueManager {
  constructor(capacity) {
    this.capacity = capacity;
    this.queue = [];
    this.processed = 0;
  }

  enqueue(packet) {
    if (this.queue.length < this.capacity) {
      this.queue.push(packet);
      return true;
    }
    return false;
  }

  dequeue() {
    if (this.queue.length > 0) {
      const packet = this.queue.shift();
      this.processed++;
      return packet;
    }
    return null;
  }

  drain(limit = null) {
    let packets;
    if (limit !== null && limit > 0) {
      packets = this.queue.splice(0, limit);
    } else {
      packets = this.queue;
      this.queue = [];
    }
    this.processed += packets.length;
    return packets;
  }

  hasCapacity() {
    return this.queue.length < this.capacity;
  }

  getCurrentQueueLength() {
    return this.queue.length;
  }

  getCapacity() {
    return this.capacity;
  }

  getUtilization() {
    return this.capacity > 0 ? this.queue.length / this.capacity : 0;
  }

  getProcessedCount() {
    return this.processed;
  }

  /**
   * Calculates estimated wait time for a new packet
   * Wait Time = Current Queue Length / Processing Rate
   */
  calculateWaitTime(processingRate = 1) {
    const rate = processingRate > 0 ? processingRate : 1;
    return this.queue.length / rate;
  }
}

module.exports = QueueManager;
