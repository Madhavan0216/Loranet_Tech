import { Battery, Signal, Wifi, WifiOff } from 'lucide-react';
import MeshTopology from '../components/MeshTopology';
import { useApp } from '../context/AppContext';

export default function MeshNetwork() {
  const { nodes, links, selectedNodeId, selectNode } = useApp();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="px-4 md:px-6 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Topology */}
        <div className="lg:col-span-8 content-card">
          <div className="content-card-header">
            <h2 className="text-[15px] font-bold text-txt">Network Topology</h2>
            <span className="badge badge-neutral text-[10px]">SAMPLE DATA</span>
          </div>
          <div className="p-4">
            <MeshTopology />
          </div>
        </div>

        {/* Node Health */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Selected Node Detail */}
          {selectedNode && (
            <div className="content-card">
              <div className="content-card-header">
                <h2 className="text-[15px] font-bold text-txt">Node Detail</h2>
                <button onClick={() => selectNode(null)} className="text-[11px] text-txt-secondary hover:text-txt">
                  Deselect
                </button>
              </div>
              <div className="content-card-body">
                <div className="text-[16px] font-bold text-txt mb-1">{selectedNode.name}</div>
                <div className="text-[11px] font-mono text-txt-secondary mb-3">{selectedNode.id} · {selectedNode.role.toUpperCase()}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-btn p-3">
                    <div className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wide">Battery</div>
                    <div className="text-[20px] font-bold text-txt mt-1">{selectedNode.battery}%</div>
                    <div className="w-full h-1.5 bg-border rounded-full mt-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${selectedNode.battery}%`,
                          background: selectedNode.battery > 30 ? '#2D8A56' : selectedNode.battery > 15 ? '#D4920A' : '#E85D3F',
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-surface rounded-btn p-3">
                    <div className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wide">Signal</div>
                    <div className="text-[20px] font-bold font-mono text-txt mt-1">{selectedNode.rssi}</div>
                    <div className="text-[10px] text-txt-secondary mt-1">SNR: {selectedNode.snr} dB</div>
                  </div>
                  <div className="bg-surface rounded-btn p-3">
                    <div className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wide">Hops</div>
                    <div className="text-[20px] font-bold text-txt mt-1">{selectedNode.hops}</div>
                    <div className="text-[10px] text-txt-secondary mt-1">{selectedNode.hops === 0 ? 'Direct' : 'Multi-hop'}</div>
                  </div>
                  <div className="bg-surface rounded-btn p-3">
                    <div className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wide">Status</div>
                    <div className={`text-[16px] font-bold mt-1 capitalize ${
                      selectedNode.status === 'online' ? 'text-success' :
                      selectedNode.status === 'degraded' ? 'text-warning' : 'text-emergency'
                    }`}>{selectedNode.status}</div>
                    <div className="text-[10px] text-txt-secondary mt-1">{selectedNode.lastSeen}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Nodes */}
          <div className="content-card flex-1">
            <div className="content-card-header">
              <h2 className="text-[15px] font-bold text-txt">Node Health</h2>
            </div>
            <div className="content-card-body flex flex-col gap-2">
              {nodes.map(node => (
                <div
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  className={`flex items-center justify-between p-2.5 rounded-btn cursor-pointer transition-colors hover:bg-surface ${
                    selectedNodeId === node.id ? 'bg-surface' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {node.status === 'online' ? (
                      <Wifi className="w-3.5 h-3.5 text-success" />
                    ) : node.status === 'degraded' ? (
                      <Wifi className="w-3.5 h-3.5 text-warning" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-emergency" />
                    )}
                    <div>
                      <div className="text-[12px] font-semibold text-txt">{node.id}</div>
                      <div className="text-[10px] text-txt-secondary">{node.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-txt-secondary">
                    <span className="flex items-center gap-1"><Battery className="w-3 h-3" />{node.battery}%</span>
                    <span className="flex items-center gap-1 font-mono"><Signal className="w-3 h-3" />{node.rssi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Link Quality */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="text-[15px] font-bold text-txt">Link Quality</h2>
            </div>
            <div className="content-card-body flex flex-col gap-1.5">
              {links.map((link, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5">
                  <span className="font-mono text-txt-secondary">{link.from} → {link.to}</span>
                  <span className={`badge ${
                    link.quality === 'strong' ? 'badge-success' :
                    link.quality === 'moderate' ? 'badge-warning' :
                    link.quality === 'weak' ? 'badge-emergency' : 'badge-neutral'
                  }`}>
                    {link.quality} ({link.rssi} dBm)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
