import { useState } from 'react';
import { PlusCircle, Link2, RefreshCw, Trash2, Sliders, Play, Pause, RotateCcw } from 'lucide-react';
import {
  createRouter,
  createLink,
  resetNetworkTopology,
  updateTrafficSettings,
  startSimulation,
  stopSimulation,
  resetSimulationPackets
} from '../services/api';

export default function CustomTopologyBuilder({ stats, onUpdate }) {
  const [activeTab, setActiveTab] = useState('router');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Router Form State
  const [routerId, setRouterId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [processingRate, setProcessingRate] = useState('');

  // Link Form State
  const [linkId, setLinkId] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [bandwidth, setBandwidth] = useState('');
  const [latency, setLatency] = useState('');

  // Traffic Form State
  const [packetRate, setPacketRate] = useState('');
  const [packetSizeMin, setPacketSizeMin] = useState('');
  const [packetSizeMax, setPacketSizeMax] = useState('');
  const [trafficSource, setTrafficSource] = useState('');
  const [trafficDestination, setTrafficDestination] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: false
  });

  // List of active routers from current network stats
  const activeRouters = stats?.routers ? stats.routers.map(r => r.id) : [];

  const handleMessage = (type, text) => {
    if (type === 'error') {
      setError(text);
      setSuccess(null);
    } else {
      setSuccess(text);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4000);
  };

  const handleStartFlow = async () => {
    setLoading(true);
    try {
      await startSimulation();
      handleMessage('success', 'Simulation started!');
      onUpdate();
    } catch (err) {
      handleMessage('error', err.message || 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleStopFlow = async () => {
    setLoading(true);
    try {
      await stopSimulation();
      handleMessage('success', 'Simulation stopped!');
      onUpdate();
    } catch (err) {
      handleMessage('error', err.message || 'Failed to stop simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFlow = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Simulation Flow',
      message: 'Are you sure you want to reset all packets, queues, and simulation time to the initial state?',
      isDanger: false,
      onConfirm: async () => {
        setLoading(true);
        try {
          await resetSimulationPackets();
          handleMessage('success', 'Simulation packets and metrics reset!');
          onUpdate();
        } catch (err) {
          handleMessage('error', err.message || 'Failed to reset packets');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSaveRouter = async (e) => {
    e.preventDefault();
    if (!routerId.trim()) return handleMessage('error', 'Router ID is required');

    const capInt = parseInt(capacity, 10);
    if (isNaN(capInt) || capInt <= 0) {
      return handleMessage('error', 'Capacity must be a positive integer');
    }

    const rateInt = processingRate ? parseInt(processingRate, 10) : 1;
    if (isNaN(rateInt) || rateInt <= 0) {
      return handleMessage('error', 'Processing rate must be a positive integer');
    }

    setLoading(true);
    try {
      const formattedId = routerId.trim().toUpperCase();
      const res = await createRouter(formattedId, capInt, rateInt);
      handleMessage('success', res.message || `Router ${formattedId} saved successfully!`);
      setRouterId('');
      setCapacity('');
      setProcessingRate('');
      onUpdate();
    } catch (err) {
      handleMessage('error', err.message || 'Failed to save router');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!linkId.trim()) return handleMessage('error', 'Link ID is required');
    if (!source || !target) return handleMessage('error', 'Both source and target routers must be selected');
    if (source === target) return handleMessage('error', 'Source and target routers must be different');

    const bwFloat = parseFloat(bandwidth);
    if (isNaN(bwFloat) || bwFloat <= 0) {
      return handleMessage('error', 'Bandwidth must be a positive number');
    }

    const latInt = parseInt(latency, 10);
    if (isNaN(latInt) || latInt <= 0) {
      return handleMessage('error', 'Latency must be a positive integer');
    }

    const formattedId = linkId.trim().toUpperCase();
    const linkExists = stats?.links?.some(l =>
      (l.source === source && l.target === target) ||
      (l.source === target && l.target === source)
    );

    const executeSave = async () => {
      setLoading(true);
      try {
        if (linkExists) {
          await stopSimulation();
        }

        const res = await createLink(
          formattedId,
          source,
          target,
          bwFloat,
          latInt
        );

        if (linkExists) {
          await resetSimulationPackets();
          handleMessage('success', res.message || `Link updated and simulation flow reset!`);
        } else {
          handleMessage('success', res.message || `Link ${formattedId} saved successfully!`);
        }

        setLinkId('');
        setSource('');
        setTarget('');
        setBandwidth('');
        setLatency('');
        onUpdate();
      } catch (err) {
        handleMessage('error', err.message || 'Failed to save link');
      } finally {
        setLoading(false);
      }
    };

    if (linkExists) {
      setConfirmModal({
        isOpen: true,
        title: 'Update Link Details',
        message: 'Updating these link details will reset the simulation flow (packets, queues, and metrics) to compute new optimal routes. Are you sure you want to proceed?',
        isDanger: false,
        onConfirm: executeSave
      });
    } else {
      executeSave();
    }
  };

  const handleResetTopology = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Network Topology',
      message: 'Are you sure you want to delete all routers and links from the topology? This will also delete all associated traffic streams.',
      isDanger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await resetNetworkTopology();
          handleMessage('success', 'Network topology has been cleared.');
          setSource('');
          setTarget('');
          onUpdate();
        } catch (err) {
          handleMessage('error', err.message || 'Failed to reset topology');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSaveTraffic = async (e) => {
    e.preventDefault();
    const rate = parseFloat(packetRate);
    const minSize = parseInt(packetSizeMin, 10);
    const maxSize = parseInt(packetSizeMax, 10);

    if (isNaN(rate) || rate <= 0) {
      return handleMessage('error', 'Packet rate must be a positive number');
    }
    if (isNaN(minSize) || minSize <= 0) {
      return handleMessage('error', 'Min packet size must be a positive integer');
    }
    if (isNaN(maxSize) || maxSize <= 0) {
      return handleMessage('error', 'Max packet size must be a positive integer');
    }
    if (minSize > maxSize) {
      return handleMessage('error', 'Min packet size cannot be greater than max packet size');
    }
    if (trafficSource && trafficDestination && trafficSource === trafficDestination) {
      return handleMessage('error', 'Source and destination routers must be different');
    }

    setLoading(true);
    setPacketRate('');
    setPacketSizeMin('');
    setPacketSizeMax('');
    setTrafficSource('');
    setTrafficDestination('');
    try {
      const res = await updateTrafficSettings(
        rate,
        minSize,
        maxSize,
        true,
        trafficSource || null,
        trafficDestination || null
      );
      handleMessage('success', res.message || 'Traffic settings updated successfully!');
      onUpdate();
    } catch (err) {
      handleMessage('error', err.message || 'Failed to update traffic settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[485px] w-full rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Topology Configurator</h4>
            <p className="text-xs text-slate-500 mt-0.5 font-outfit">Add and update details of routers</p>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-100 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('router')}
            className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'router' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Routers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'link' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Links
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('traffic')}
            className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'traffic' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Traffic
          </button>
        </div>

        {/* Notification Toasts inside panel */}
        {error && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-600 text-center animate-fade-in font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-600 text-center animate-fade-in font-medium">
            {success}
          </div>
        )}

        {/* Tab Forms */}
        <div className="flex-1">
          {activeTab === 'router' && (
            <form onSubmit={handleSaveRouter} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Router ID</label>
                  <input
                    type="text"
                    placeholder="e.g. R1"
                    value={routerId}
                    onChange={(e) => setRouterId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase placeholder:normal-case"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity (Pkts)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={capacity}
                    min="1"
                    max="100"
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Proc. Rate</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={processingRate}
                    min="1"
                    max="10"
                    onChange={(e) => setProcessingRate(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Save Router
              </button>
            </form>
          )}

          {activeTab === 'link' && (
            <form onSubmit={handleSaveLink} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Source Router</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {activeRouters.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Router</label>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {activeRouters.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Link ID</label>
                  <input
                    type="text"
                    placeholder="e.g. L1"
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase placeholder:normal-case"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bandwidth (MBpt)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={bandwidth}
                    min="1"
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Latency (Ticks)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={latency}
                    min="1"
                    onChange={(e) => setLatency(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                Save Link
              </button>
            </form>
          )}

          {activeTab === 'traffic' && (
            <form onSubmit={handleSaveTraffic} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate (Pkts/Tick)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 1"
                    value={packetRate}
                    onChange={(e) => setPacketRate(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Min Size (B)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={packetSizeMin}
                    onChange={(e) => setPacketSizeMin(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Size (B)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1000"
                    value={packetSizeMax}
                    onChange={(e) => setPacketSizeMax(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Source Router</label>
                  <select
                    value={trafficSource}
                    onChange={(e) => setTrafficSource(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer bg-white"
                  >
                    <option value="">Random</option>
                    {activeRouters.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination Router</label>
                  <select
                    value={trafficDestination}
                    onChange={(e) => setTrafficDestination(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer bg-white"
                  >
                    <option value="">Random</option>
                    {activeRouters.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sliders className="h-3.5 w-3.5" />}
                Save Traffic
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Simulation Controls Section */}
      <div className="border-t border-slate-100 pt-3 mb-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Simulation Flow Control
          <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-normal ${stats?.trafficEnabled
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
            {stats?.trafficEnabled ? 'Running' : 'Stopped'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button
            type="button"
            onClick={handleStartFlow}
            disabled={loading || stats?.trafficEnabled}
            className={`py-2 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${stats?.trafficEnabled
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-50'
              }`}
            title="Start Packet Simulation"
          >
            <Play className="h-3.5 w-3.5 fill-current animate-pulse" />
            Start
          </button>
          <button
            type="button"
            onClick={handleStopFlow}
            disabled={loading || !stats?.trafficEnabled}
            className={`py-2 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${!stats?.trafficEnabled
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 shadow-sm shadow-amber-50'
              }`}
            title="Stop Packet Simulation"
          >
            <Pause className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
          <button
            type="button"
            onClick={handleResetFlow}
            disabled={loading}
            className="py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl shadow-md shadow-indigo-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Clear all packets and reset metrics history"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Flow
          </button>
        </div>
      </div>

      {/* Persistent Reset Button at the bottom */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={handleResetTopology}
          disabled={loading}
          className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset Entire Topology
        </button>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden p-6 flex flex-col gap-4 scale-in animate-scale-up">
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-xl border flex-shrink-0 ${confirmModal.isDanger
                ? 'bg-rose-50 text-rose-600 border-rose-100'
                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}>
                {confirmModal.isDanger ? <Trash2 className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
              </span>
              <h3 className="text-sm font-bold font-outfit text-slate-800 uppercase tracking-wider">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-outfit leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const onConfirm = confirmModal.onConfirm;
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  if (onConfirm) await onConfirm();
                }}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer ${confirmModal.isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                  }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
