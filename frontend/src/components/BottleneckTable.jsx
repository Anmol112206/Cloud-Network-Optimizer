import { AlertCircle, Link2 } from 'lucide-react';

const THRESHOLD_SEVERE = parseFloat(import.meta.env.VITE_THRESHOLD_SEVERE || '0.8');

export default function BottleneckTable({ bottlenecks }) {
  const list = bottlenecks || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col h-[280px] shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Active Bottlenecks</h4>
          <p className="text-xs text-slate-500 mt-0.5">High utilization link connections</p>
        </div>
        {list.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full animate-pulse">
            <AlertCircle className="h-3 w-3" />
            {list.length} Alerts
          </span>
        )}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 pr-1">
        {list.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-500">
            <span className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Link2 className="h-4 w-4" />
            </span>
            All links operating within normal capacity limits
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider sticky top-0 bg-white z-10">
                <th className="py-2.5">Link ID</th>
                <th className="py-2.5 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item, idx) => {
                const percent = (item.utilization * 100).toFixed(3);
                const isSevere = item.utilization >= THRESHOLD_SEVERE;
                
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="py-3 font-semibold text-slate-700 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSevere ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      {item.linkId}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        {/* Small Progress Bar */}
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${isSevere ? 'bg-rose-500' : 'bg-amber-500'}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold ${isSevere ? 'text-rose-600' : 'text-amber-600'}`}>
                          {percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
