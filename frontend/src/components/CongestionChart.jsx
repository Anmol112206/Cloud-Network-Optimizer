import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CongestionChart({ snapshots }) {
  // Take last 50 snapshots for cleaner visualization
  const chartData = React.useMemo(() => {
    if (!snapshots || !Array.isArray(snapshots)) return [];
    return snapshots
      .slice(-50)
      .map(snap => ({
        tick: snap.tick,
        congestion: parseFloat((snap.congestion * 100).toFixed(1)),
        throughput: parseFloat(snap.throughput.toFixed(2))
      }));
  }, [snapshots]);

  return (
    <div className="h-[280px] w-full rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Congestion Trend</h4>
          <p className="text-xs text-slate-500 mt-0.5">Average network congestion over simulation ticks</p>
        </div>
      </div>

      <div className="h-full w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No historical snapshot data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
              <XAxis 
                dataKey="tick" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                domain={[0, 100]}
                unit="%"
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                  fontSize: '11px',
                  color: '#0f172a'
                }}
                labelFormatter={(value) => `Tick: ${value}`}
              />
              <Area 
                type="monotone" 
                dataKey="congestion" 
                name="Congestion"
                stroke="#f59e0b" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCongestion)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
