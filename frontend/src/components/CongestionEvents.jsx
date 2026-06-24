import { useMemo } from 'react';
import { AlertOctagon, Sparkles } from 'lucide-react';

export default function CongestionEvents({ stats }) {
  // Identify congested routers from the stats feed
  const events = useMemo(() => {
    const routers = stats?.routers || [];
    return routers
      .map(r => {
        const utilPercent = r.load * 100;
        let severity = null;
        let severityClass = '';

        if (r.load > 0.8) {
          severity = 'SEVERE';
          severityClass = 'bg-rose-50 border-rose-200 text-rose-700';
        } else if (r.load > 0.5) {
          severity = 'MODERATE';
          severityClass = 'bg-amber-50 border-amber-200 text-amber-700';
        }

        if (severity) {
          return {
            routerId: r.id,
            utilization: utilPercent.toFixed(0),
            severity,
            severityClass
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [stats?.routers]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col h-[280px] shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Congestion Alerts</h4>
          <p className="text-xs text-slate-500 mt-0.5">Router resource overloading reports</p>
        </div>
        {events.length > 0 && (
          <span className="p-1.5 rounded bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <AlertOctagon className="h-4 w-4 animate-bounce" />
          </span>
        )}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 pr-1 space-y-3">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-500">
            <span className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Sparkles className="h-4 w-4" />
            </span>
            All routers operating with healthy resource utilization
          </div>
        ) : (
          events.map((event, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-slate-200 transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${event.severity === 'SEVERE' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <div>
                  <h5 className="text-xs font-bold text-slate-700">Router {event.routerId}</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Utilization: {event.utilization}%</p>
                </div>
              </div>
              
              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${event.severityClass}`}>
                {event.severity}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
