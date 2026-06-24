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
      const { network } = this.getContext(req);
      const stats = network.getNetworkStats();
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
      if (!id || capacity === undefined) {
        return res.status(400).json({ error: 'Missing required fields: id, capacity' });
      }
      
      const capInt = parseInt(capacity, 10);
      const rateInt = processingRate !== undefined ? parseInt(processingRate, 10) : 1;
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
      if (!id || !source || !target || bandwidth === undefined || latency === undefined) {
        return res.status(400).json({ error: 'Missing required fields: id, source, target, bandwidth, latency' });
      }
      
      const bwFloat = parseFloat(bandwidth);
      const latInt = parseInt(latency, 10);
      
      const { network, topology, routingService, networkId } = this.getContext(req);
      const existing = network.getLink(id);
      if (existing) {
        existing.bandwidth = bwFloat;
        existing.latency = latInt;
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
        
        return res.json({ success: true, message: `Link ${id} updated`, link: existing });
      }

      if (!network.getRouter(source) || !network.getRouter(target)) {
        return res.status(400).json({ error: 'Source or target router does not exist in network' });
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
      const { packetRate, packetSizeMin, packetSizeMax, enabled, source, destination } = req.body;
      const { generator, networkId } = this.getContext(req);
      
      let rate, minSize, maxSize, isEnabled, src, dest;
      if (generator) {
        if (packetRate !== undefined) generator.options.packetRate = parseFloat(packetRate);
        if (packetSizeMin !== undefined) generator.options.packetSizeMin = parseInt(packetSizeMin, 10);
        if (packetSizeMax !== undefined) generator.options.packetSizeMax = parseInt(packetSizeMax, 10);
        if (enabled !== undefined) generator.options.enabled = !!enabled;
        if (source !== undefined) generator.options.source = source || null;
        if (destination !== undefined) generator.options.destination = destination || null;
        
        rate = generator.options.packetRate;
        minSize = generator.options.packetSizeMin;
        maxSize = generator.options.packetSizeMax;
        isEnabled = generator.options.enabled;
        src = generator.options.source;
        dest = generator.options.destination;
      } else {
        rate = parseFloat(packetRate) || 1.5;
        minSize = parseInt(packetSizeMin, 10) || 100;
        maxSize = parseInt(packetSizeMax, 10) || 1500;
        isEnabled = enabled !== undefined ? !!enabled : true;
        src = source !== undefined ? source : null;
        dest = destination !== undefined ? destination : null;
      }

      if (!this.bypassPersistence) {
        const trafficData = {
          packetRate: rate,
          packetSizeMin: minSize,
          packetSizeMax: maxSize,
          enabled: isEnabled,
          source: src,
          destination: dest
        };
        await this.trafficRepository.save(trafficData, networkId);
        await this.metricsCache.cacheTraffic(trafficData, networkId);
      }

      res.json({ success: true, message: 'Traffic settings updated', options: generator ? generator.options : null });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async resetNetwork(req, res) {
    try {
      const { network, topology, routingService, networkId, clock, simulator, snapshotService } = this.getContext(req);
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
      
      if (!this.bypassPersistence) {
        await this.routerRepository.clear(networkId);
        await this.linkRepository.clear(networkId);
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
}

module.exports = NetworkController;
