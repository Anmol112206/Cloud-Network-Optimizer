/**
 * Packet Entity
 * Represents a data packet traversing the network
 */
class Packet {
  constructor(id, source, destination, size) {
    this.id = id;
    this.source = source;
    this.destination = destination;
    this.size = size;           // bytes
    this.createdAt = Date.now();
    this.status = Packet.States.CREATED;
    this.path = [];
    this.currentHop = 0;
    this.deliveredAt = null;
    this.droppedAt = null;
  }

  getAge(now = Date.now()) {
    return now - this.createdAt;
  }

  getId() {
    return this.id;
  }

  getSource() {
    return this.source;
  }

  getDestination() {
    return this.destination;
  }

  getSize() {
    return this.size;
  }

  getStatus() {
    return this.status;
  }

  setStatus(status, now = null) {
    this.status = status;
    if (status === Packet.States.DROPPED && this.droppedAt === null) {
      this.droppedAt = now;
    }
  }

  addToPath(routerId) {
    this.path.push(routerId);
  }

  getPath() {
    return this.path;
  }

  markDelivered(now = Date.now()) {
    this.status = Packet.States.DELIVERED;
    this.deliveredAt = now;
  }

  getDeliveryTime() {
    return this.deliveredAt !== null ? this.deliveredAt - this.createdAt : null;
  }
}

// State constants
Packet.States = {
  CREATED: 'CREATED',
  ROUTED: 'ROUTED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  DROPPED: 'DROPPED',
  UNREACHABLE: 'UNREACHABLE'
};

// Expose on class level directly as well
Packet.CREATED = Packet.States.CREATED;
Packet.ROUTED = Packet.States.ROUTED;
Packet.IN_TRANSIT = Packet.States.IN_TRANSIT;
Packet.DELIVERED = Packet.States.DELIVERED;
Packet.DROPPED = Packet.States.DROPPED;
Packet.UNREACHABLE = Packet.States.UNREACHABLE;

module.exports = Packet;

