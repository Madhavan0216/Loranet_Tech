import { useState } from 'react';
import { Search, Battery, Signal, Clock, MapPin } from 'lucide-react';
import MapView from '../components/MapView';
import { useApp } from '../context/AppContext';

export default function LiveMap() {
  const { nodes, selectedNodeId, selectNode } = useApp();
  const [search, setSearch] = useState('');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const filtered = nodes.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 md:px-6 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map */}
        <div className="lg:col-span-8 content-card">
          <div className="p-3">
            <MapView height="calc(100vh - 200px)" />
          </div>
        </div>

        {/* Device Panel */}
        <div className="lg:col-span-4 content-card flex flex-col" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          <div className="content-card-header flex-col !items-start gap-3">
            <h2 className="text-[15px] font-bold text-txt">Devices</h2>
            <div className="relative w-full">
              <Search className="w-4 h-4 text-txt-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(node => (
              <div
                key={node.id}
                onClick={() => selectNode(node.id)}
                className={`px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-surface ${
                  selectedNodeId === node.id ? 'bg-surface' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-txt">{node.name}</span>
                  <span className={`badge ${
                    node.status === 'online' ? 'badge-success' :
                    node.status === 'degraded' ? 'badge-warning' : 'badge-emergency'
                  }`}>
                    {node.status}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-txt-secondary mb-1">{node.id} · {node.role}</div>
                <div className="flex items-center gap-3 text-[11px] text-txt-secondary">
                  <span className="flex items-center gap-1"><Battery className="w-3 h-3" />{node.battery}%</span>
                  <span className="flex items-center gap-1"><Signal className="w-3 h-3" />{node.rssi} dBm</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{node.lastSeen}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected detail */}
          {selectedNode && (
            <div className="border-t border-border p-4 bg-surface">
              <div className="text-[13px] font-bold text-txt mb-2">{selectedNode.name}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-txt-secondary">
                  <MapPin className="w-3 h-3" />
                  <span className="font-mono">{selectedNode.lat.toFixed(4)}, {selectedNode.lng.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-txt-secondary">
                  <Battery className="w-3 h-3" />
                  <span>{selectedNode.battery}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-txt-secondary">
                  <Signal className="w-3 h-3" />
                  <span className="font-mono">{selectedNode.rssi} dBm / SNR {selectedNode.snr}</span>
                </div>
                <div className="flex items-center gap-1.5 text-txt-secondary">
                  <Clock className="w-3 h-3" />
                  <span>{selectedNode.lastSeen}</span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-txt-secondary">
                Hops: <span className="font-mono font-semibold">{selectedNode.hops === 0 ? 'DIRECT' : `${selectedNode.hops}-HOP`}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
