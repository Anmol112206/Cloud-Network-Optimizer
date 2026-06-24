import { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function TopologyGraph({ stats }) {
  const { nodes, edges } = useMemo(() => {
    const routers = stats?.routers || [];
    const links = stats?.links || [];
    // Generate circular layout coordinates
    const nodes = routers.map((r, idx) => {
      const angle = (idx / routers.length) * 2 * Math.PI - Math.PI / 2;
      const x = 250 + 150 * Math.cos(angle);
      const y = 160 + 130 * Math.sin(angle);

      const load = r.load || 0;
      
      // Load dependent styles for nodes
      const bg = load > 0.8 ? '#ef4444' : load > 0.5 ? '#f59e0b' : '#10b981';
      const border = load > 0.8 ? '#dc2626' : load > 0.5 ? '#d97706' : '#059669';
      const text = '#ffffff';
      const glow = load > 0.8 ? '0 0 20px rgba(239, 68, 68, 0.15)' : load > 0.5 ? '0 0 15px rgba(245, 158, 11, 0.1)' : '0 0 15px rgba(16, 185, 129, 0.1)';

      return {
        id: r.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center text-white">
              <div className="font-bold text-xs font-outfit text-white">{r.id}</div>
              <div className="text-[10px] opacity-90 mt-0.5 font-medium">Load: {(load * 100).toFixed(0)}%</div>
              <div className="text-[9px] opacity-80 font-medium">Queue: {r.queueLength}</div>
            </div>
          )
        },
        className: `rounded-xl transition-all duration-300 ${load > 0.8 ? 'animate-pulse' : ''}`,
        style: {
          width: 95,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 2,
          borderStyle: 'solid',
          color: text,
          boxShadow: glow
        }
      };
    });

    const edges = links.map(l => {
      const util = l.utilization || 0;
      let strokeColor = '#10b981'; // Green
      let strokeWidth = 3;
      let strokeDasharray = undefined;

      if (util > 0.8) {
        strokeColor = '#ef4444'; // Red
        strokeWidth = 4.5;
        strokeDasharray = '5,5';
      } else if (util > 0.5) {
        strokeColor = '#f59e0b'; // Yellow
        strokeWidth = 3.5;
      }

      return {
        id: l.id,
        source: l.source,
        target: l.target,
        animated: util > 0.2, // Animate when traffic is transiting
        style: { 
          stroke: strokeColor, 
          strokeWidth,
          strokeDasharray
        },
        label: `${(util * 100).toFixed(0)}%`,
        labelStyle: { fill: strokeColor, fontSize: 9, fontWeight: 'bold' },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
      };
    });

    return { nodes, edges };
  }, [stats?.routers, stats?.links]);

  return (
    <div className="h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-sm relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg border bg-white/95 border-slate-200 text-slate-700 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider font-outfit">Topology Map</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        style={{
          background: 'transparent', // Let container background shine through
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        nodesDraggable={true}
        elementsSelectable={false}
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#64748b" opacity={0.25} />
        <Controls 
          showInteractive={false} 
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)'
          }}
        />
      </ReactFlow>
    </div>
  );
}
