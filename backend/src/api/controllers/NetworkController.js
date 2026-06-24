const routerRepositoryDefault = require('../../infrastructure/database/RouterRepository');
const linkRepositoryDefault = require('../../infrastructure/database/LinkRepository');
const trafficRepositoryDefault = require('../../infrastructure/database/TrafficSettingsRepository');
const metricsCacheDefault = require('../../infrastructure/redis/MetricsCache');

/**
 * Network Controller
 * Handles network-related API requests
 */
class NetworkController {
  constructor(network, routingService, congestionService, topology, generator, options = {}) {
    this.network = network;
    this.routingService = routingService;
    this.congestionService = congestionService;
    this.topology = topology;
    this.generator = generator;
    this.routerRepository = options.routerRepository || routerRepositoryDefault;
    this.linkRepository = options.linkRepository || linkRepositoryDefault;
    this.trafficRepository = options.trafficRepository || trafficRepositoryDefault;
    this.metricsCache = options.metricsCache || metricsCacheDefault;
    this.bypassPersistence = options.bypassPersistence !== undefined ? options.bypassPersistence : (process.env.NODE_ENV === 'test');
  }

  getContext(req) {
    if (req && req.networkContext) {
      return req.networkContext;
    }
    return {
      network: this.network,
      routingService: this.routingService,
      congestionService: this.congestionService,
      topology: this.topology,
      generator: this.generator,
      networkId: 'default-network'
    };
  }

  getNetworkStats(req, res) {
    try {
      const { network, generator } = this.getContext(req);
      const stats = network.getNetworkStats();
      stats.trafficEnabled = generator ? generator.options.enabled : false;
      stats.trafficSettings = generator ? generator.streams : [];
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  createPacket(req, res) {
    try {
      const { id, source, destination, size } = req.body;

      if (!id || !source || !destination || !size) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { network } = this.getContext(req);
      const packet = network.createPacket(id, source, destination, size);
      res.status(201).json(packet);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  routePacket(req, res) {
    try {
      const { packetId } = req.body;
      const { network, routingService } = this.getContext(req);
      const packet = network.getPackets().find(p => p.getId() === packetId);

      if (!packet) {
        return res.status(404).json({ error: 'Packet not found' });
      }

      const success = routingService.routePacket(packet);
      res.json({ success, packet });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  getCongestion(req, res) {
    try {
      const routerId = req.params.routerId;
      const { congestionService } = this.getContext(req);

      if (routerId) {
        const congestion = congestionService.getCongestionLevel(routerId);
        if (congestion === null) {
          return res.status(404).json({ error: 'Router not found' });
        }
        return res.json({ routerId, congestion });
      }

      const congestion = congestionService.getNetworkCongestion();
      res.json(congestion);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async addRouter(req, res) {
    try {
      const { id, capacity, processingRate } = req.body;
      if (!id || capacity === undefined || capacity === null) {
        return res.status(400).json({ error: 'Missing required fields: id, capacity' });
      }

      const capInt = parseInt(capacity, 10);
      if (isNaN(capInt) || capInt <= 0) {
        return res.status(400).json({ error: 'Capacity must be a positive integer' });
      }

      const rateInt = (processingRate !== undefined && processingRate !== null) ? parseInt(processingRate, 10) : 1;
      if (isNaN(rateInt) || rateInt <= 0) {
        return res.status(400).json({ error: 'Processing rate must be a positive integer' });
      }
      const { network, networkId } = this.getContext(req);
      const existing = network.getRouter(id);
      if (existing) {
        existing.queueManager.capacity = capInt;
        existing.processingRate = rateInt;

        if (!this.bypassPersistence) {
          await this.routerRepository.save({ id, capacity: capInt, processingRate: rateInt }, networkId);
          await this.metricsCache.cacheRouters(
            Array.from(network.routers.values()).map(r => ({ id: r.getId(), capacity: r.getCapacity(), processingRate: r.getProcessingRate() })),
            networkId
          );
        }

        return res.json({ success: true, message: `Router ${id} updated`, router: existing });
      }

      const router = network.addRouter(id, capInt, rateInt);

      if (!this.bypassPersistence) {
        await this.routerRepository.save({ id, capacity: capInt, processingRate: rateInt }, networkId);
        await this.metricsCache.cacheRouters(
          Array.from(network.routers.values()).map(r => ({ id: r.getId(), capacity: r.getCapacity(), processingRate: r.getProcessingRate() })),
          networkId
        );
      }

      res.status(201).json({ success: true, message: `Router ${id} added`, router });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async addLink(req, res) {
    try {
      const { id, source, target, bandwidth, latency } = req.body;
      if (!id || !source || !target || bandwidth === undefined || bandwidth === null || latency === undefined || latency === null) {
        return res.status(400).json({ error: 'Missing required fields: id, source, target, bandwidth, latency' });
      }

      const bwFloat = parseFloat(bandwidth);
      if (isNaN(bwFloat) || bwFloat <= 0) {
        return res.status(400).json({ error: 'Bandwidth must be a positive number' });
      }

      const latInt = parseInt(latency, 10);
      if (isNaN(latInt) || latInt <= 0) {
        return res.status(400).json({ error: 'Latency must be a positive integer' });
      }

      const { network, topology, routingService, networkId } = this.getContext(req);

      if (!network.getRouter(source) || !network.getRouter(target)) {
        return res.status(400).json({ error: 'Source or target router does not exist in network' });
      }

      // Check if a link already exists between these two routers (in either direction)
      const existingLink = Array.from(network.links.values()).find(l =>
        (l.getSource() === source && l.getTarget() === target) ||
        (l.getSource() === target && l.getTarget() === source)
      );

      if (existingLink) {
        existingLink.bandwidth = bwFloat;
        existingLink.latency = latInt;

        if (routingService) {
          routingService.clearCache();
        }

        if (!this.bypassPersistence) {
          await this.linkRepository.save({ id: existingLink.getId(), source, target, bandwidth: bwFloat, latency: latInt }, networkId);
          await this.metricsCache.cacheLinks(
            Array.from(network.links.values()).map(l => ({
              id: l.getId(),
              source: l.getSource(),
              target: l.getTarget(),
              bandwidth: l.getBandwidth(),
              latency: l.getLatency()
            })),
            networkId
          );
        }

        return res.json({ success: true, message: `Link ${existingLink.getId()} updated`, link: existingLink });
      }


      const link = network.addLink(id, source, target, bwFloat, latInt);
      topology.addConnection(source, target, id);

      if (routingService) {
        routingService.clearCache();
      }

      if (!this.bypassPersistence) {
        await this.linkRepository.save({ id, source, target, bandwidth: bwFloat, latency: latInt }, networkId);
        await this.metricsCache.cacheLinks(
          Array.from(network.links.values()).map(l => ({
            id: l.getId(),
            source: l.getSource(),
            target: l.getTarget(),
            bandwidth: l.getBandwidth(),
            latency: l.getLatency()
          })),
          networkId
        );
      }

      res.status(201).json({ success: true, message: `Link ${id} added`, link });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async updateTraffic(req, res) {
    try {
      const { id, packetRate, packetSizeMin, packetSizeMax, source, destination } = req.body;
      const { generator, networkId } = this.getContext(req);

      const streamId = id || `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const rate = packetRate !== undefined ? parseFloat(packetRate) : 1.5;
      const minSize = packetSizeMin !== undefined ? parseInt(packetSizeMin, 10) : 100;
      const maxSize = packetSizeMax !== undefined ? parseInt(packetSizeMax, 10) : 1500;
      const isEnabled = true;
      const src = source || null;
      const dest = destination || null;

      const stream = {
        id: streamId,
        packetRate: rate,
        packetSizeMin: minSize,
        packetSizeMax: maxSize,
        enabled: isEnabled,
        source: src,
        destination: dest
      };

      if (generator) {
        const existingIdx = generator.streams.findIndex(s => s.id === streamId);
        if (existingIdx !== -1) {
          generator.streams[existingIdx] = stream;
        } else {
          generator.streams.push(stream);
        }
      }

      if (!this.bypassPersistence) {
        await this.trafficRepository.save(stream, networkId);

        // Cache all streams back
        const allStreams = generator ? generator.streams : [stream];
        await this.metricsCache.cacheTraffic(allStreams, networkId);

        // Update the cached metrics to reflect the new traffic setting immediately
        const cachedMetrics = await this.metricsCache.getCurrentMetrics(networkId);
        if (cachedMetrics) {
          cachedMetrics.trafficConfiguration = allStreams;
          await this.metricsCache.cacheMetrics(cachedMetrics, networkId);
        }
      }

      res.json({ success: true, message: 'Traffic stream saved successfully', stream, streams: generator ? generator.streams : [stream] });
    } catch (e) {
      console.error('Error in updateTraffic:', e);
      res.status(500).json({ error: e.message });
    }
  }

  async resetNetwork(req, res) {
    try {
      const { network, topology, routingService, networkId, clock, simulator, snapshotService, generator } = this.getContext(req);
      network.clear();
      topology.clear();
      if (routingService) {
        routingService.clearCache();
      }
      if (clock) {
        clock.reset();
      }
      if (simulator && simulator.activeTransits) {
        simulator.activeTransits.clear();
      }
      if (generator) {
        generator.streams = [];
      }

      if (!this.bypassPersistence) {
        await this.routerRepository.clear(networkId);
        await this.linkRepository.clear(networkId);
        await this.trafficRepository.clear(networkId);
        await this.metricsCache.clearTopology(networkId);
        if (snapshotService && snapshotService.snapshotRepository && typeof snapshotService.snapshotRepository.clear === 'function') {
          await snapshotService.snapshotRepository.clear(networkId);
        }
      }

      res.json({ success: true, message: 'Network topology reset' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async startSimulation(req, res) {
    try {
      const { generator, networkId } = this.getContext(req);
      if (generator) {
        generator.options.enabled = true;
      }

      res.json({ success: true, message: 'Simulation packet flows started', trafficEnabled: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async stopSimulation(req, res) {
    try {
      const { generator, networkId } = this.getContext(req);
      if (generator) {
        generator.options.enabled = false;
      }

      res.json({ success: true, message: 'Simulation packet flows stopped', trafficEnabled: false });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async resetPackets(req, res) {
    try {
      const { network, routingService, networkId, clock, simulator, snapshotService, generator, congestionService } = this.getContext(req);

      // 1. Clear packets in network
      network.packets = [];
      network.time = 0;

      // 2. Clear router queues and statistics
      if (network.routers) {
        for (const router of network.routers.values()) {
          if (router.queueManager) {
            router.queueManager.queue = [];
            router.queueManager.processed = 0;
          }
        }
      }

      // 3. Clear link packets and usage
      if (network.links) {
        for (const link of network.links.values()) {
          link.packets = [];
          link.currentUsage = 0;
        }
      }

      // 4. Clear active transits in simulator
      if (simulator && simulator.activeTransits) {
        simulator.activeTransits.clear();
      }

      // 5. Reset clock time
      if (clock) {
        clock.reset();
      }

      // 6. Reset generator count
      if (generator) {
        generator.generatedCount = 0;
      }

      // 7. Clear routing service cache
      if (routingService) {
        routingService.clearCache();
      }

      // 8. Clear congestion service history
      if (congestionService) {
        congestionService.history = [];
      }

      // 9. Update database and Redis
      if (!this.bypassPersistence) {
        // Wait for any pending snapshot processes to finish writing to DB/Redis
        if (snapshotService && typeof snapshotService.waitForPending === 'function') {
          await snapshotService.waitForPending();
        }

        // Clear all saved snapshots for this network in PostgreSQL
        if (snapshotService && snapshotService.snapshotRepository && typeof snapshotService.snapshotRepository.clear === 'function') {
          await snapshotService.snapshotRepository.clear(networkId);
        }

        // Cache empty snapshots array to Redis immediately
        await this.metricsCache.cacheSnapshots([], networkId);

        // Compute and cache clean initial metrics to Redis immediately to overwrite any stale data
        const routerLoads = {};
        if (network.routers) {
          for (const [id, r] of network.routers.entries()) {
            routerLoads[id] = 0;
          }
        }
        const linkUtilization = {};
        if (network.links) {
          for (const [id, l] of network.links.entries()) {
            linkUtilization[id] = 0;
          }
        }

        const initialMetrics = {
          tick: 0,
          throughput: 0,
          latency: 0,
          packetLoss: 0,
          congestion: 0,
          bottlenecks: [],
          routerLoads,
          linkUtilization,
          trafficConfiguration: generator ? generator.streams : []
        };
        await this.metricsCache.cacheMetrics(initialMetrics, networkId);
      }

      res.json({ success: true, message: 'Simulation packet flow reset to initial condition' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async deleteTrafficStream(req, res) {
    try {
      const { id } = req.params;
      const { generator, networkId } = this.getContext(req);

      if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
      }

      if (generator) {
        generator.streams = generator.streams.filter(s => s.id !== id);
      }

      if (!this.bypassPersistence) {
        await this.trafficRepository.delete(id, networkId);

        const allStreams = generator ? generator.streams : [];
        await this.metricsCache.cacheTraffic(allStreams, networkId);

        // Update the cached metrics immediately
        const cachedMetrics = await this.metricsCache.getCurrentMetrics(networkId);
        if (cachedMetrics) {
          cachedMetrics.trafficConfiguration = allStreams;
          await this.metricsCache.cacheMetrics(cachedMetrics, networkId);
        }
      }

      res.json({ success: true, message: `Traffic stream ${id} deleted`, streams: generator ? generator.streams : [] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async deleteLink(req, res) {
    try {
      const { id } = req.params;
      const { network, topology, routingService, networkId } = this.getContext(req);

      if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
      }

      const link = network.getLink(id);
      if (!link) {
        return res.status(404).json({ error: `Link ${id} not found` });
      }

      network.links.delete(id);
      topology.removeConnection(link.getSource(), link.getTarget());

      if (routingService) {
        routingService.clearCache();
      }

      if (!this.bypassPersistence) {
        await this.linkRepository.delete(id, networkId);
        await this.metricsCache.cacheLinks(
          Array.from(network.links.values()).map(l => ({
            id: l.getId(),
            source: l.getSource(),
            target: l.getTarget(),
            bandwidth: l.getBandwidth(),
            latency: l.getLatency()
          })),
          networkId
        );
      }

      res.json({ success: true, message: `Link ${id} deleted` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async deleteRouter(req, res) {
    try {
      const { id } = req.params;
      const { network, topology, routingService, networkId, generator } = this.getContext(req);

      if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
      }

      const router = network.getRouter(id);
      if (!router) {
        return res.status(404).json({ error: `Router ${id} not found` });
      }

      // 1. Delete from network
      network.routers.delete(id);

      // 2. Delete connected links
      const linksToDelete = [];
      for (const link of network.links.values()) {
        if (link.getSource() === id || link.getTarget() === id) {
          linksToDelete.push(link);
        }
      }

      for (const link of linksToDelete) {
        network.links.delete(link.getId());
        topology.removeConnection(link.getSource(), link.getTarget());
        if (!this.bypassPersistence) {
          await this.linkRepository.delete(link.getId(), networkId);
        }
      }

      // 3. Delete connected traffic streams
      const streamsToDelete = [];
      if (generator) {
        streamsToDelete.push(...generator.streams.filter(s => s.source === id || s.destination === id));
        generator.streams = generator.streams.filter(s => s.source !== id && s.destination !== id);
      }

      if (!this.bypassPersistence) {
        for (const stream of streamsToDelete) {
          await this.trafficRepository.delete(stream.id, networkId);
        }
        await this.routerRepository.delete(id, networkId);
      }

      if (routingService) {
        routingService.clearCache();
      }

      if (!this.bypassPersistence) {
        // Cache routers
        await this.metricsCache.cacheRouters(
          Array.from(network.routers.values()).map(r => ({ id: r.getId(), capacity: r.getCapacity(), processingRate: r.getProcessingRate() })),
          networkId
        );
        // Cache links
        await this.metricsCache.cacheLinks(
          Array.from(network.links.values()).map(l => ({
            id: l.getId(),
            source: l.getSource(),
            target: l.getTarget(),
            bandwidth: l.getBandwidth(),
            latency: l.getLatency()
          })),
          networkId
        );
        // Cache traffic settings
        const allStreams = generator ? generator.streams : [];
        await this.metricsCache.cacheTraffic(allStreams, networkId);
      }

      res.json({ success: true, message: `Router ${id} and connected elements deleted` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = NetworkController;
