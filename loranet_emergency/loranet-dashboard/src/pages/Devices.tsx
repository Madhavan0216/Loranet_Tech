import { useState } from 'react';
import {
  Cpu, Search, Battery, Signal, MapPin,
  Radio, Send, RefreshCw, Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Devices() {
  const { nodes, selectedNodeId, selectNode, pingNode, addToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'gateway' | 'relay' | 'rescue' | 'victim'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');

  const filteredNodes = nodes.filter(n => {
    const matchesSearch =
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || n.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || filteredNodes[0] || nodes[0];

  const onlineCount = nodes.filter(n => n.status === 'online').length;
  const degradedCount = nodes.filter(n => n.status === 'degraded').length;
  const offlineCount = nodes.filter(n => n.status === 'offline').length;
  const avgBattery = Math.round(nodes.reduce((acc, n) => acc + n.battery, 0) / nodes.length);

  const handleLocate = (id: string) => {
    selectNode(id);
    navigate('/map');
  };

  const handleSendMessage = (id: string) => {
    selectNode(id);
    navigate('/messages');
  };

  return (
    <div className="px-4 md:px-6 pb-8">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Total Inventory</span>
            <div className="w-8 h-8 rounded-[10px] bg-surface flex items-center justify-center">
              <Cpu className="w-4 h-4 text-txt-secondary" />
            </div>
          </div>
          <div className="metric-value text-txt">{nodes.length}</div>
          <div className="text-[12px] text-txt-secondary mt-1">LoRa transceiver nodes</div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Online & Healthy</span>
            <div className="w-8 h-8 rounded-[10px] bg-success-light flex items-center justify-center">
              <Radio className="w-4 h-4 text-success" />
            </div>
          </div>
          <div className="metric-value text-success">{onlineCount}</div>
          <div className="text-[12px] text-txt-secondary mt-1">{degradedCount} degraded signal</div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Offline / Lost</span>
            <div className="w-8 h-8 rounded-[10px] bg-emergency-light flex items-center justify-center">
              <Signal className="w-4 h-4 text-emergency" />
            </div>
          </div>
          <div className="metric-value text-emergency">{offlineCount}</div>
          <div className="text-[12px] text-emergency font-medium mt-1">Pending link recovery</div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Avg Battery Health</span>
            <div className="w-8 h-8 rounded-[10px] bg-surface flex items-center justify-center">
              <Battery className="w-4 h-4 text-txt-secondary" />
            </div>
          </div>
          <div className="metric-value text-txt">{avgBattery}<span className="text-[18px] text-txt-secondary ml-0.5">%</span></div>
          <div className="text-[12px] text-txt-secondary mt-1">LiFePO4 / 18650 cells</div>
        </div>
      </div>

      {/* Main Grid: Device List Table + Selected Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table List */}
        <div className="lg:col-span-8 content-card flex flex-col">
          <div className="content-card-header flex-col md:flex-row gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-txt">Mesh Hardware Registry</h2>
              <p className="text-[12px] text-txt-secondary mt-0.5">ESP32 + Semtech SX1262 LoRa Node Telemetry</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addToast('Network poll initiated across all LoRa frequencies', 'info')}
                className="btn btn-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Poll Network
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-border bg-surface/50 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-txt-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by Node ID or Name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-btn border border-border bg-card text-[12px] font-medium text-txt outline-none"
              >
                <option value="all">All Roles</option>
                <option value="gateway">Gateway</option>
                <option value="relay">Relay</option>
                <option value="rescue">Rescue Team</option>
                <option value="victim">Victim</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-btn border border-border bg-card text-[12px] font-medium text-txt outline-none"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="degraded">Degraded</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/75 text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Node / Device</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Battery</th>
                  <th className="py-3 px-3">RF Link</th>
                  <th className="py-3 px-3">Hops</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredNodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-txt-secondary text-[13px]">
                      No devices match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredNodes.map(node => {
                    const isSelected = selectedNode?.id === node.id;

                    return (
                      <tr
                        key={node.id}
                        onClick={() => selectNode(node.id)}
                        className={`cursor-pointer transition-colors hover:bg-surface/60 ${
                          isSelected ? 'bg-surface font-medium' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[13px] text-txt">{node.name}</div>
                          <div className="font-mono text-[11px] text-txt-secondary">{node.id}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] font-semibold capitalize px-2 py-0.5 rounded bg-surface border border-border text-txt">
                            {node.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`badge ${
                            node.status === 'online' ? 'badge-success' :
                            node.status === 'degraded' ? 'badge-warning' : 'badge-emergency'
                          }`}>
                            {node.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-[12px] font-mono">
                            <Battery className={`w-3.5 h-3.5 ${
                              node.battery > 50 ? 'text-success' : node.battery > 20 ? 'text-warning' : 'text-emergency'
                            }`} />
                            <span>{node.battery}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-[12px] font-mono text-txt">{node.rssi} dBm</div>
                          <div className="text-[10px] text-txt-secondary font-mono">SNR: {node.snr} dB</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[12px] text-txt-secondary">
                            {node.hops === 0 ? 'Direct' : `${node.hops} hop`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              title="Ping node"
                              onClick={() => pingNode(node.id)}
                              className="p-1.5 hover:bg-card rounded-btn text-txt-secondary hover:text-txt transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Locate on map"
                              onClick={() => handleLocate(node.id)}
                              className="p-1.5 hover:bg-card rounded-btn text-txt-secondary hover:text-txt transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Device Inspector */}
        <div className="lg:col-span-4">
          {selectedNode ? (
            <div className="content-card sticky top-6">
              <div className="content-card-header">
                <div>
                  <span className="text-[11px] font-mono text-txt-secondary uppercase">Device Telemetry</span>
                  <h2 className="text-[16px] font-bold text-txt">{selectedNode.name}</h2>
                </div>
                <span className={`badge ${
                  selectedNode.status === 'online' ? 'badge-success' :
                  selectedNode.status === 'degraded' ? 'badge-warning' : 'badge-emergency'
                }`}>
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>

              <div className="content-card-body flex flex-col gap-4">
                {/* Hardware Spec */}
                <div className="p-3.5 bg-surface rounded-btn border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-txt-secondary">{selectedNode.id}</span>
                    <span className="text-[11px] font-semibold text-txt uppercase px-2 py-0.5 rounded bg-card border border-border">
                      {selectedNode.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-txt-secondary">
                    Module: <span className="font-mono text-txt font-semibold">ESP32 + Semtech SX1262</span>
                  </div>
                  <div className="text-[11px] text-txt-secondary mt-1">
                    Frequency: <span className="font-mono text-txt">868.100 MHz (SF9 / BW 125kHz)</span>
                  </div>
                  <div className="text-[11px] text-txt-secondary mt-1">
                    Heartbeat: <span className="text-txt font-mono">{selectedNode.lastSeen}</span>
                  </div>
                </div>

                {/* Battery Meter */}
                <div>
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <span className="font-semibold text-txt flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5" /> Battery Reserve
                    </span>
                    <span className="font-mono font-bold text-txt">{selectedNode.battery}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedNode.battery}%`,
                        background:
                          selectedNode.battery > 50 ? '#2D8A56' :
                          selectedNode.battery > 20 ? '#D4920A' : '#E85D3F',
                      }}
                    />
                  </div>
                </div>

                {/* RF Link Metrics */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="p-3 bg-card border border-border rounded-btn">
                    <span className="text-[11px] text-txt-secondary block">Signal Strength (RSSI)</span>
                    <strong className="text-[18px] font-mono text-txt">{selectedNode.rssi}</strong>
                    <span className="text-[11px] text-txt-secondary ml-1">dBm</span>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-btn">
                    <span className="text-[11px] text-txt-secondary block">Signal-to-Noise (SNR)</span>
                    <strong className="text-[18px] font-mono text-txt">+{selectedNode.snr}</strong>
                    <span className="text-[11px] text-txt-secondary ml-1">dB</span>
                  </div>
                </div>

                {/* GPS Location Snapshot */}
                <div className="p-3.5 bg-surface rounded-btn border border-border">
                  <div className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1">
                    GPS Coordinates
                  </div>
                  <div className="font-mono text-[13px] font-bold text-txt">
                    {selectedNode.lat.toFixed(5)}° N, {selectedNode.lng.toFixed(5)}° E
                  </div>
                  <div className="text-[11px] text-txt-secondary mt-1">
                    Accuracy: ±3.2 meters (Active 3D GNSS fix)
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => pingNode(selectedNode.id)}
                    className="btn btn-primary justify-center w-full py-2.5"
                  >
                    <Zap className="w-4 h-4" />
                    Ping Transceiver via LoRa
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleLocate(selectedNode.id)}
                      className="btn justify-center py-2"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Map
                    </button>
                    <button
                      onClick={() => handleSendMessage(selectedNode.id)}
                      className="btn justify-center py-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Direct Msg
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="content-card p-8 text-center text-txt-secondary text-[13px]">
              Select a device from the registry to view telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
