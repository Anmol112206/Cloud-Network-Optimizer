import { Activity, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function MetricsCard({ metrics, congestion }) {
  const throughput = metrics?.throughput !== undefined ? metrics.throughput.toFixed(2) : '0.00';
  const latency = metrics?.latency !== undefined ? metrics.latency.toFixed(2) : '0.00';
  const packetLoss = metrics?.packetLoss !== undefined ? (metrics.packetLoss * 100).toFixed(1) : '0.0';
  const avgCongestion = congestion?.average !== undefined ? (congestion.average * 100).toFixed(1) : '0.0';
  const trend = congestion?.trend || 'stable';

  const cards = [
    {
      title: 'Throughput',
      value: `${throughput} packets/tick`,
      description: 'Active packet delivery rate',
      icon: Activity,
      colorClass: 'from-emerald-50 to-teal-50/40 border-emerald-200 text-emerald-700',
      glowClass: 'bg-emerald-200/20'
    },
    {
      title: 'Latency',
      value: `${latency} ticks`,
      description: 'Average packet transit delay',
      icon: Clock,
      colorClass: 'from-indigo-50 to-violet-50/40 border-indigo-200 text-indigo-700',
      glowClass: 'bg-indigo-200/20'
    },
    {
      title: 'Packet Loss',
      value: `${packetLoss}%`,
      description: 'Dropped packets ratio',
      icon: AlertTriangle,
      colorClass: 'from-rose-50 to-orange-50/40 border-rose-200 text-rose-700',
      glowClass: 'bg-rose-200/20'
    },
    {
      title: 'Average Congestion',
      value: `${avgCongestion}%`,
      description: `Trend is currently ${trend}`,
      icon: ShieldAlert,
      colorClass: 'from-amber-50 to-orange-50/40 border-amber-200 text-amber-700',
      glowClass: 'bg-amber-200/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-200/50 bg-gradient-to-br ${card.colorClass}`}
          >
            {/* Background Glow */}
            <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl ${card.glowClass}`} />
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium tracking-wide uppercase text-slate-500">{card.title}</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 font-outfit">{card.value}</h3>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-sm flex items-center justify-center">
                <IconComponent className="h-5 w-5" />
              </div>
            </div>
            
            <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
              {card.title === 'Average Congestion' && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  trend === 'increasing' ? 'bg-rose-500' : trend === 'decreasing' ? 'bg-emerald-500' : 'bg-slate-400'
                }`} />
              )}
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
