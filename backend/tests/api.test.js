const MetricsController = require('../src/api/controllers/MetricsController');
const CongestionController = require('../src/api/controllers/CongestionController');
const SnapshotController = require('../src/api/controllers/SnapshotController');

describe('API Controller Layer Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      statusCode: 200,
      jsonPayload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonPayload = data;
        return this;
      }
    };
  });

  describe('MetricsController', () => {
    it('should retrieve metrics from MetricsService and return via JSON', async () => {
      const mockMetricsService = {
        getCurrentMetrics: jest.fn().mockResolvedValue({
          throughput: 42,
          latency: 8,
          packetLoss: 0.01
        })
      };

      const controller = new MetricsController(mockMetricsService);
      await controller.getCurrentMetrics({}, mockRes);

      expect(mockMetricsService.getCurrentMetrics).toHaveBeenCalled();
      expect(mockRes.jsonPayload).toEqual({
        throughput: 42,
        latency: 8,
        packetLoss: 0.01
      });
      expect(mockRes.statusCode).toBe(200);
    });

    it('should return 500 when service throws an error', async () => {
      const mockMetricsService = {
        getCurrentMetrics: jest.fn().mockRejectedValue(new Error('Redis failure'))
      };

      const controller = new MetricsController(mockMetricsService);
      await controller.getCurrentMetrics({}, mockRes);

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonPayload).toEqual({ error: 'Redis failure' });
    });
  });

  describe('CongestionController', () => {
    it('should retrieve congestion data', async () => {
      const mockCongestionService = {
        getCurrentCongestion: jest.fn().mockResolvedValue({
          average: 0.65,
          trend: 'increasing'
        }),
        getBottlenecks: jest.fn()
      };

      const controller = new CongestionController(mockCongestionService);
      await controller.getCongestion({}, mockRes);

      expect(mockCongestionService.getCurrentCongestion).toHaveBeenCalled();
      expect(mockRes.jsonPayload).toEqual({ average: 0.65, trend: 'increasing' });
    });

    it('should retrieve bottlenecks list', async () => {
      const mockCongestionService = {
        getCurrentCongestion: jest.fn(),
        getBottlenecks: jest.fn().mockResolvedValue([
          { linkId: 'R1-R2', utilization: 0.88 }
        ])
      };

      const controller = new CongestionController(mockCongestionService);
      await controller.getBottlenecks({}, mockRes);

      expect(mockCongestionService.getBottlenecks).toHaveBeenCalled();
      expect(mockRes.jsonPayload).toEqual([
        { linkId: 'R1-R2', utilization: 0.88 }
      ]);
    });
  });

  describe('SnapshotController', () => {
    it('should retrieve all snapshots', async () => {
      const mockSnapshots = [
        { id: 1, tick: 1, throughput: 10 },
        { id: 2, tick: 2, throughput: 12 }
      ];
      const mockSnapshotService = {
        getAll: jest.fn().mockResolvedValue(mockSnapshots),
        getLatest: jest.fn()
      };

      const controller = new SnapshotController(mockSnapshotService);
      await controller.getAll({}, mockRes);

      expect(mockSnapshotService.getAll).toHaveBeenCalled();
      expect(mockRes.jsonPayload).toBe(mockSnapshots);
    });

    it('should retrieve latest snapshot', async () => {
      const mockSnapshot = { id: 2, tick: 2, throughput: 12 };
      const mockSnapshotService = {
        getAll: jest.fn(),
        getLatest: jest.fn().mockResolvedValue(mockSnapshot)
      };

      const controller = new SnapshotController(mockSnapshotService);
      await controller.getLatest({}, mockRes);

      expect(mockSnapshotService.getLatest).toHaveBeenCalled();
      expect(mockRes.jsonPayload).toBe(mockSnapshot);
    });

    it('should return 404 when latest snapshot is not found', async () => {
      const mockSnapshotService = {
        getAll: jest.fn(),
        getLatest: jest.fn().mockResolvedValue(null)
      };

      const controller = new SnapshotController(mockSnapshotService);
      await controller.getLatest({}, mockRes);

      expect(mockRes.statusCode).toBe(404);
      expect(mockRes.jsonPayload).toEqual({ error: 'No snapshots found' });
    });
  });
});
