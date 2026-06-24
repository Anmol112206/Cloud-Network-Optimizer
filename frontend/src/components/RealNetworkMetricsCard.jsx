import { Download, Upload, Cpu, ShieldAlert, CheckCircle } from 'lucide-react';

export default function RealNetworkMetricsCard({ metrics }) {
  const download = metrics?.downloadMbps !== undefined ? metrics.downloadMbps.toFixed(1) : '0.0';
  const upload = metrics?.uploadMbps !== undefined ? metrics.uploadMbps.toFixed(1) : '0.0';
  const iface = metrics?.interface || 'N/A';
  const status = metrics?.status || 'N/A';

  const cards = [
    {
      title: 'Download Speed',
      value: `${download} Mbps`,
      description: 'Current real incoming speed',
      icon: Download,
      colorClass: 'from-emerald-50 to-teal-50/40 border-emerald-200 text-emerald-700',
    },
    {
      title: 'Upload Speed',
      value: `${upload} Mbps`,
      description: 'Current real outgoing speed',
      icon: Upload,
      colorClass: 'from-indigo-50 to-violet-50/40 border-indigo-200 text-indigo-700',
    },
    {
      title: 'Active Interface',
      value: iface,
      description: 'Local connection hardware',
      icon: Cpu,
      colorClass: 'from-amber-50 to-orange-50/40 border-amber-200 text-amber-700',
    },
    {
      title: 'Status',
      value: status === 'up' ? 'Connected' : 'Disconnected',
      description: status === 'up' ? 'Hardware is active' : 'Interface is down',
      icon: status === 'up' ? CheckCircle : ShieldAlert,
      colorClass: status === 'up'
        ? 'from-teal-50 to-emerald-50/40 border-teal-200 text-teal-700'
        : 'from-rose-50 to-orange-50/40 border-rose-200 text-rose-700',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div key={idx} className={`p-5 rounded-2xl border bg-gradient-to-br ${card.colorClass} shadow-sm transition-all hover:scale-[1.01]`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.title}</span>
                <h3 className="text-xl font-bold font-outfit mt-1">{card.value}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-white shadow-sm">
                <IconComponent className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
}
