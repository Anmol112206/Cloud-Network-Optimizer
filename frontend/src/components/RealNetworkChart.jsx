import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RealNetworkChart({ history }) {
  const chartData = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    // The history from Redis lists latest first, so reverse it for the chart to flow chronologically (left to right)
    return [...history].reverse().map(snap => {
      let timeString;
      try {
        timeString = new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        timeString = String(snap.timestamp || '');
      }
      return {
        time: timeString,
        Download: parseFloat(snap.downloadMbps.toFixed(2)),
        Upload: parseFloat(snap.uploadMbps.toFixed(2))
      };
    });
  }, [history]);

  return (
    <div className="h-[380px] w-full rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Network Usage History</h4>
          <p className="text-xs text-slate-500 mt-0.5">Real-time OS network upload and download trends</p>
        </div>
      </div>

      <div className="h-full w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No historical statistics available yet. Ensure monitor is running.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#e2e8f0" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#e2e8f0" unit="M" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Legend verticalAlign="top" height={36} align="right" tick={{ fill: '#475569', fontSize: 12 }} />
              <Area type="monotone" dataKey="Download" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDownload)" />
              <Area type="monotone" dataKey="Upload" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorUpload)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
