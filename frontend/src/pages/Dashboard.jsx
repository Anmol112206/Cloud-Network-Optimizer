import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Radio, ShieldAlert, Cpu } from 'lucide-react';
import { 
  fetchNetworkStats, 
  fetchLiveMetrics, 
  fetchCongestionStats, 
  fetchBottlenecks, 
  fetchSnapshots,
  fetchRealNetworkLive,
  fetchRealNetworkHistory
} from '../services/api';

import MetricsCard from '../components/MetricsCard';
import TopologyGraph from '../components/TopologyGraph';
import CongestionChart from '../components/CongestionChart';
import BottleneckTable from '../components/BottleneckTable';
import CongestionEvents from '../components/CongestionEvents';
import CustomTopologyBuilder from '../components/CustomTopologyBuilder';
import ConfigurationDetails from '../components/ConfigurationDetails';
import RealNetworkMetricsCard from '../components/RealNetworkMetricsCard';
import RealNetworkChart from '../components/RealNetworkChart';

export default function Dashboard() {
  const [viewMode, setViewMode] = useState('virtual'); // 'virtual' or 'real'
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [congestion, setCongestion] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [realMetrics, setRealMetrics] = useState(null);
  const [realHistory, setRealHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  // Force light mode theme attributes on mount
  useEffect(() => {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const loadData = useCallback(async () => {
    try {
      if (viewMode === 'virtual') {
        const [statsData, metricsData, congestionData, bottlenecksData, snapshotsData] = await Promise.all([
          fetchNetworkStats(),
          fetchLiveMetrics(),
          fetchCongestionStats(),
          fetchBottlenecks(),
          fetchSnapshots()
        ]);

        setStats(statsData);
        setMetrics(metricsData);
        setCongestion(congestionData);
        setBottlenecks(bottlenecksData);
        setSnapshots(snapshotsData);
      } else {
        const [liveData, historyData] = await Promise.all([
          fetchRealNetworkLive(),
          fetchRealNetworkHistory()
        ]);
        setRealMetrics(liveData);
        setRealHistory(historyData);
      }
      
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('API Poll error:', err);
      setError('Connection to simulator backend offline.');
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    let active = true;

    const fetchInit = async () => {
      if (active) {
        await loadData();
      }
    };

    fetchInit();

    // 2-second polling loop
    let intervalId = null;
    if (isPolling) {
      intervalId = setInterval(() => {
        if (active) {
          loadData();
        }
      }, 2000);
    }

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling, loadData]);

  const handleViewModeChange = (mode) => {
    if (mode !== viewMode) {
      setLoading(true);
      setViewMode(mode);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-outfit text-slate-800 leading-none">Cloud Network Optimizer</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${error ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
              {error ? 'Disconnected' : (viewMode === 'virtual' ? 'Active Simulator Feed' : 'Active PC Monitor Feed')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleViewModeChange('virtual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-outfit transition-all cursor-pointer ${
                viewMode === 'virtual'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Virtual Simulator
            </button>
            <button
              onClick={() => handleViewModeChange('real')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-outfit transition-all cursor-pointer ${
                viewMode === 'real'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Real PC Monitor
            </button>
          </div>

          {lastUpdated && (
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline-block">
              Last Sync: {lastUpdated}
            </span>
          )}

          <button
            onClick={() => loadData()}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 transition-all shadow-sm cursor-pointer"
            title="Force refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide uppercase transition-all shadow-sm cursor-pointer ${
              isPolling 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${isPolling ? 'animate-pulse' : ''}`} />
            {isPolling ? 'Polling' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-center gap-2.5 animate-pulse shadow-sm">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{error} Please ensure the backend server is running and database connections are active.</span>
          </div>
        )}

        {loading && ((viewMode === 'virtual' && !stats) || (viewMode === 'real' && !realMetrics)) ? (
          <div className="h-[400px] w-full flex flex-col items-center justify-center gap-3">
            <Cpu className="h-8 w-8 text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500">
              {viewMode === 'virtual' ? 'Initializing simulation dashboard...' : 'Connecting to local PC network hardware...'}
            </span>
          </div>
        ) : (
          <>
            {viewMode === 'virtual' ? (
              <>
                {/* Live Metrics Grid */}
                <MetricsCard metrics={metrics} congestion={congestion} />

                {/* Dashboard Middle Section: Graph and Custom Builder */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8">
                    <TopologyGraph stats={stats} />
                  </div>
                  <div className="lg:col-span-4">
                    <CustomTopologyBuilder stats={stats} onUpdate={() => loadData()} />
                  </div>
                </div>

                {/* Configuration Inventory Details */}
                <div className="grid grid-cols-1 gap-6">
                  <ConfigurationDetails stats={stats} onUpdate={() => loadData()} />
                </div>

                {/* Dashboard Bottom Section: Charts, Bottlenecks, and Events */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6">
                    <CongestionChart snapshots={snapshots} />
                  </div>
                  <div className="lg:col-span-3">
                    <BottleneckTable bottlenecks={bottlenecks} />
                  </div>
                  <div className="lg:col-span-3">
                    <CongestionEvents stats={stats} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Live PC Metrics cards */}
                <RealNetworkMetricsCard metrics={realMetrics} />

                {/* PC Network Traffic History Chart */}
                <div className="grid grid-cols-1 gap-6">
                  <RealNetworkChart history={realHistory} />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
