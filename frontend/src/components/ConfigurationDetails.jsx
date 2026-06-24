import { useState } from 'react';
import { Cpu, HardDrive, Share2, Sliders, Trash2 } from 'lucide-react';
import { deleteTrafficStream, deleteLink, deleteRouter, stopSimulation, resetSimulationPackets } from '../services/api';

export default function ConfigurationDetails({ stats, onUpdate }) {
  const routers = stats?.routers || [];
  const links = stats?.links || [];
  const trafficStreams = stats?.trafficSettings || [];
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: false
  });

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Traffic Stream',
      message: 'Are you sure you want to delete this traffic stream? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        setLoadingId(id);
        setError(null);
        try {
          await deleteTrafficStream(id);
          if (onUpdate) onUpdate();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Failed to delete traffic stream');
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const handleDeleteLink = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Link',
      message: 'Are you sure you want to delete this link? Deleting this link will stop the simulation, reset all packets, queues, and simulation metrics. This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        setLoadingId(id);
        setError(null);
        try {
          await stopSimulation();
          await deleteLink(id);
          await resetSimulationPackets();
          if (onUpdate) onUpdate();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Failed to delete link');
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const handleDeleteRouter = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Router',
      message: `Are you sure you want to delete router ${id}? Deleting this router will stop the simulation, delete the router, and autonomously delete all connected links and traffic streams. It will also reset all packets, queues, and simulation metrics. This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        setLoadingId(id);
        setError(null);
        try {
          await stopSimulation();
          await deleteRouter(id);
          await resetSimulationPackets();
          if (onUpdate) onUpdate();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Failed to delete router');
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold font-outfit text-slate-800 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-indigo-500" />
          Active Topology Configuration
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-outfit">Detailed inventory of all configured routers, links, and active traffic parameters</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold text-xs flex justify-between items-center animate-fade-in">
          <span>{error}</span>
          <button 
            type="button" 
            onClick={() => setError(null)} 
            className="text-rose-500 hover:text-rose-700 font-bold text-base cursor-pointer focus:outline-none"
          >
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Routers List */}
        <div className="lg:col-span-3 border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-indigo-400" />
            Configured Routers ({routers.length})
          </h4>
          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
            {routers.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No routers configured.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Router ID</th>
                    <th className="pb-2">Capacity</th>
                    <th className="pb-2">Proc. Rate</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routers.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-100/50">
                      <td className="py-2.5 font-bold text-slate-700">{r.id}</td>
                      <td className="py-2.5 font-semibold text-slate-600">{r.capacity || 'N/A'} pkts</td>
                      <td className="py-2.5 font-semibold text-slate-600">{r.processingRate || 1} pkts/tick</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteRouter(r.id)}
                          disabled={loadingId !== null}
                          className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                          title="Delete Router"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Links List */}
        <div className="lg:col-span-4 border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Share2 className="h-4 w-4 text-indigo-400" />
            Configured Links ({links.length})
          </h4>
          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
            {links.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No links configured.</p>
            ) : (
               <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Link ID</th>
                    <th className="pb-2">Path</th>
                    <th className="pb-2">Bandwidth</th>
                    <th className="pb-2">Latency</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {links.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-100/50">
                      <td className="py-2.5 font-bold text-slate-700">{l.id}</td>
                      <td className="py-2.5 font-semibold text-slate-600">{l.source} ➔ {l.target}</td>
                      <td className="py-2.5 font-semibold text-slate-600">{l.bandwidth} MBpt</td>
                      <td className="py-2.5 font-semibold text-slate-600">{l.latency} ticks</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteLink(l.id)}
                          disabled={loadingId !== null}
                          className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                          title="Delete Link"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Traffic Settings Details */}
        <div className="lg:col-span-5 border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-indigo-400" />
            Traffic Parameters ({trafficStreams.length})
          </h4>
          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
            {trafficStreams.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No traffic streams configured.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Path</th>
                    <th className="pb-2">Rate</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trafficStreams.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-100/50">
                      <td className="py-2 font-bold text-slate-700">
                        {t.source || 'Random'} ➔ {t.destination || 'Random'}
                      </td>
                      <td className="py-2 font-semibold text-slate-600">{t.packetRate} pkts/t</td>
                      <td className="py-2 font-semibold text-slate-600">{t.packetSizeMin}B - {t.packetSizeMax}B</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={loadingId !== null}
                            className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                            title="Delete Traffic"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden p-6 flex flex-col gap-4 scale-in animate-scale-up">
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-xl border flex-shrink-0 ${
                confirmModal.isDanger 
                  ? 'bg-rose-50 text-rose-600 border-rose-100' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}>
                <Trash2 className="h-5 w-5" />
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
                className="px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 shadow-rose-100"
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
