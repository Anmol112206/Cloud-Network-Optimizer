/**
 * Snapshot Controller
 * Handles snapshot-related API requests
 */
class SnapshotController {
  constructor(snapshotService) {
    this.snapshotService = snapshotService;
  }

  async getAll(req, res) {
    try {
      const snapshotService = req.networkContext?.snapshotService || this.snapshotService;
      const snapshots = await snapshotService.getAll();
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLatest(req, res) {
    try {
      const snapshotService = req.networkContext?.snapshotService || this.snapshotService;
      const latest = await snapshotService.getLatest();
      if (!latest) {
        return res.status(404).json({ error: 'No snapshots found' });
      }
      res.json(latest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SnapshotController;
