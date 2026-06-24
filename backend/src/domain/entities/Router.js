/**
 * Router Entity
 * Represents a network router in the domain model
 */
const QueueManager = require('../../services/QueueManager');

class Router {
  constructor(id, capacity, processingRate = 1) {
    this.id = id;
    this.processingRate = processingRate;
    this.queueManager = new QueueManager(capacity);
    this.createdAt = new Date();
  }

  processPacket(packet) {
    return this.queueManager.enqueue(packet);
  }

  getLoad() {
    return this.queueManager.getUtilization();
  }

  drain() {
    return this.queueManager.drain();
  }

  getId() {
    return this.id;
  }

  getCapacity() {
    return this.queueManager.getCapacity();
  }

  getQueueLength() {
    return this.queueManager.getCurrentQueueLength();
  }

  getProcessingRate() {
    return this.processingRate;
  }

  // Getters for backward compatibility
  get queue() {
    return this.queueManager.queue;
  }

  get processed() {
    return this.queueManager.processed;
  }
}

module.exports = Router;

