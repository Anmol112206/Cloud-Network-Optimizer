const Packet = require('../domain/entities/Packet');

/**
 * Packet Simulator
 * Advances packet propagation along computed paths on clock ticks
 */
class PacketSimulator {
  constructor(network, clock, routingService) {
    this.network = network;
    this.clock = clock;
    this.routingService = routingService;
    
    // Track active simulation states for packets on links
    // Map of packetId -> { packet, currentLinkId, ticksRemaining }
    this.activeTransits = new Map();

    if (this.clock) {
      this.unsubscribe = this.clock.onTick(() => this.step());
    }
  }

  // Prepares newly routed packets to be processed at their source router
  initializePackets() {
    const networkPackets = this.network.getPackets();
    for (const packet of networkPackets) {
      // Auto-route packets that are in CREATED state
      if (packet.getStatus() === Packet.States.CREATED) {
        if (this.routingService) { 
          this.routingService.routePacket(packet);
        }
      }

      // If a packet is in ROUTED state and currentHop is 0, and not already transiting
      if (packet.getStatus() === Packet.States.ROUTED && 
          packet.currentHop === 0 && 
          !this.activeTransits.has(packet.getId())) {
        
        const path = packet.getPath();
        if (path && path.length > 0) {
          const sourceRouterId = path[0];
          const router = this.network.getRouter(sourceRouterId);
          if (router) {
            // Check if the packet is already in the router's queue
            const isAlreadyQueued = router.queue.some(p => p.getId() === packet.getId());
            if (!isAlreadyQueued) {
              const queued = router.processPacket(packet);
              if (!queued) {
                packet.setStatus(Packet.States.DROPPED); // Queue full at source router
              }
            }
          }
        }
      }
    }
  }

  step() {
    // 1. Check for newly routed packets to place them in their source router queue
    this.initializePackets();

    // 2. Advance link transits
    for (const [packetId, state] of this.activeTransits.entries()) {
      const { packet, currentLinkId } = state;
      state.ticksRemaining--;

      if (state.ticksRemaining <= 0) {
        // Propagation finished! Arrive at the next router on the path
        const link = this.network.getLink(currentLinkId);
        if (link) {
          // Remove from link's active packets list
          link.packets = link.packets.filter(p => p.getId() !== packetId);
        }

        this.activeTransits.delete(packetId);

        // Increment currentHop
        packet.currentHop++;
        const path = packet.getPath();
        const nextRouterId = path[packet.currentHop];

        if (!nextRouterId) {
          packet.setStatus(Packet.States.DROPPED);
          continue;
        }

        // Check if destination is reached
        if (packet.currentHop === path.length - 1) {
          packet.markDelivered(this.clock ? this.clock.getCurrentTime() : Date.now());
        } else {
          // Intermediate router arrival, queue it
          const nextRouter = this.network.getRouter(nextRouterId);
          if (nextRouter) {
            const queued = nextRouter.processPacket(packet);
            if (queued) {
              packet.setStatus(Packet.States.ROUTED); // Back to ROUTED state while in queue
            } else {
              packet.setStatus(Packet.States.DROPPED); // Congestion drop
            }
          } else {
            packet.setStatus(Packet.States.DROPPED); // Unreachable router
          }
        }
      }
    }

    // 3. Process router queue drains and start transmission on links
    const routers = Array.from(this.network.routers.values());
    for (const router of routers) {
      // Drain all packets currently queued in this router
      const queuedPackets = router.drain();
      
      for (const packet of queuedPackets) {
        // If packet is already dropped, ignore
        if (packet.getStatus() === Packet.States.DROPPED) continue;

        const path = packet.getPath();
        const nextRouterId = path[packet.currentHop + 1];

        if (!nextRouterId) {
          // No next router, check if destination reached
          if (packet.currentHop === path.length - 1) {
            packet.markDelivered(this.clock ? this.clock.getCurrentTime() : Date.now());
          } else {
            packet.setStatus(Packet.States.DROPPED);
          }
          continue;
        }

        // Find the link connecting currentRouter to nextRouterId
        const currentRouterId = path[packet.currentHop];
        const link = this._findLinkBetween(currentRouterId, nextRouterId);

        if (link) {
          link.transmit(packet);
          packet.setStatus(Packet.States.IN_TRANSIT);
          this.activeTransits.set(packet.getId(), {
            packet,
            currentLinkId: link.getId(),
            ticksRemaining: link.getLatency()
          });
        } else {
          packet.setStatus(Packet.States.DROPPED); // Drop if no link exists
        }
      }
    }
  }

  _findLinkBetween(routerAId, routerBId) {
    const links = Array.from(this.network.links.values());
    return links.find(l => 
      (l.getSource() === routerAId && l.getTarget() === routerBId) ||
      (l.getSource() === routerBId && l.getTarget() === routerAId)
    );
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

module.exports = PacketSimulator;
