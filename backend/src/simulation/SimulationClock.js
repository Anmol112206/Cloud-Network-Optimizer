/**
 * Simulation Clock
 * Manages virtual time steps (ticks) for deterministic simulation
 */
class SimulationClock {
  constructor() {
    this.time = 0;
    this.listeners = [];
  }

  getCurrentTime() {
    return this.time;
  }

  tick() {
    this.time++;
    this.listeners.forEach(fn => {
      try {
        fn(this.time);
      } catch (err) {
        // Safe execution of callbacks
        console.error('Error in clock listener:', err);
      }
    });
    return this.time;
  }

  reset() {
    this.time = 0;
  }

  onTick(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== callback);
    };
  }
}

module.exports = SimulationClock;
