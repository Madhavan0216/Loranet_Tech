import { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, MapPin, Search,
  Filter, ShieldAlert, ArrowRight, UserCheck, Send, Mic, Volume2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import VoiceRecorderModal from '../components/VoiceRecorderModal';

export default function EmergencyAlerts() {
  const {
    alerts, nodes, acknowledgeAlert, resolveAlert,
    selectNode, simulateEmergencyAlert, triggerVoiceSOS, addToast, speakVoice
  } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'voice'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');
  const [replyVoiceModalOpen, setReplyVoiceModalOpen] = useState(false);

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch =
      a.deviceName.toLowerCase().includes(search.toLowerCase()) ||
      a.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    
    let matchesPriority = true;
    if (priorityFilter === 'voice') {
      matchesPriority = !!a.voiceData;
    } else if (priorityFilter !== 'all') {
      matchesPriority = a.priority === priorityFilter;
    }

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const selectedAlert = alerts.find(a => a.id === selectedAlertId) || filteredAlerts[0] || alerts[0];
  const associatedNode = selectedAlert ? nodes.find(n => n.id === selectedAlert.deviceId) : null;

  const handleLocateOnMap = (deviceId: string) => {
    selectNode(deviceId);
    navigate('/map');
  };

  const handleDispatchRescue = (alertId: string, deviceName: string) => {
    addToast(`Rescue Team Bravo dispatched for incident ${alertId} (${deviceName})!`, 'emergency');
    speakVoice(`Rescue team Bravo dispatched to coordinates for ${deviceName}. Audio guidance beacon activated.`);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const criticalCount = alerts.filter(a => a.priority === 'critical' && a.status === 'active').length;
  const voiceAlertCount = alerts.filter(a => !!a.voiceData).length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  return (
    <div className="px-4 md:px-6 pb-8">
      {/* Top Banner / Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="metric-label">Active Incidents</div>
          <div className="metric-value text-emergency mt-1">{activeCount}</div>
          <div className="text-[11px] text-txt-secondary mt-1">Requires immediate response</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Critical SOS</div>
          <div className="metric-value text-emergency mt-1">{criticalCount}</div>
          <div className="text-[11px] text-emergency font-semibold mt-1">High priority victim alerts</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Voice Distress Notes</div>
          <div className="metric-value text-blue-600 mt-1">{voiceAlertCount}</div>
          <div className="text-[11px] text-txt-secondary mt-1">Blind/illiterate voice notes</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Resolved</div>
          <div className="metric-value text-success mt-1">{resolvedCount}</div>
          <div className="text-[11px] text-success font-semibold mt-1">Safely rescued / cleared</div>
        </div>
      </div>

      {/* Main Grid: Alert List (Left) & Alert Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search, Filter, List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="content-card">
            <div className="content-card-header flex-col md:flex-row gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emergency" />
                <h2 className="text-[15px] font-bold text-txt">Incident Queue</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => triggerVoiceSOS()}
                  className="btn btn-sm btn-emergency flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Simulate Voice SOS
                </button>
                <button
                  onClick={simulateEmergencyAlert}
                  className="btn btn-sm btn-ghost border border-border"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  Hardware SOS
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="p-4 border-b border-border bg-surface/50 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-txt-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, name, voice keywords..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-txt-secondary shrink-0" />
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-btn border border-border bg-card text-[12px] font-medium text-txt outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="voice">🎙️ Voice Notes Only</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-btn border border-border bg-card text-[12px] font-medium text-txt outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="content-card-body flex flex-col gap-3">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-txt-secondary text-[13px]">
                  No emergency alerts found matching your criteria.
                </div>
              ) : (
                filteredAlerts.map(alert => {
                  const isSelected = selectedAlert?.id === alert.id;
                  const isCritical = alert.priority === 'critical' && alert.status === 'active';
                  const hasVoice = !!alert.voiceData;

                  return (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setSelectedAlertId(alert.id);
                        selectNode(alert.deviceId);
                      }}
                      className={`alert-item transition-all ${
                        isCritical ? 'critical' : ''
                      } ${isSelected ? 'ring-2 ring-active' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {hasVoice && (
                              <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold flex items-center gap-1">
                                <Mic className="w-3 h-3" />
                                VOICE SOS
                              </span>
                            )}
                            <span className={`badge ${
                              alert.priority === 'critical' ? 'badge-emergency' :
                              alert.priority === 'high' ? 'badge-warning' : 'badge-neutral'
                            }`}>
                              {alert.priority.toUpperCase()}
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-txt">{alert.id}</span>
                            <span className="text-txt-secondary text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {alert.timestamp}
                            </span>
                            <span className={`badge ml-auto ${
                              alert.status === 'active' ? 'badge-emergency' :
                              alert.status === 'acknowledged' ? 'badge-warning' : 'badge-success'
                            }`}>
                              {alert.status}
                            </span>
                          </div>

                          <div className="text-[14px] font-bold text-txt mb-1">{alert.deviceName}</div>
                          <div className="text-[12px] text-txt-secondary leading-relaxed line-clamp-2">
                            {alert.message}
                          </div>

                          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-txt-secondary flex-wrap">
                            <span className="font-mono">
                              📍 {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{alert.deviceId}</span>
                            <span>•</span>
                            <span className={`badge ${
                              alert.deliveryStatus === 'delivered' ? 'badge-success' :
                              alert.deliveryStatus === 'pending' ? 'badge-warning' : 'badge-emergency'
                            }`}>
                              Mesh: {alert.deliveryStatus}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0 self-center">
                          <ArrowRight className="w-4 h-4 text-txt-secondary" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Alert Dossier */}
        <div className="lg:col-span-5">
          {selectedAlert ? (
            <div className="content-card sticky top-6">
              <div className="content-card-header">
                <div>
                  <span className="text-[11px] font-mono text-txt-secondary uppercase">Incident Dossier</span>
                  <h2 className="text-[16px] font-bold text-txt">{selectedAlert.id}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAlert.voiceData && (
                    <span className="badge bg-blue-100 text-blue-700 font-bold flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      Voice Note Active
                    </span>
                  )}
                  <span className={`badge ${
                    selectedAlert.status === 'active' ? 'badge-emergency' :
                    selectedAlert.status === 'acknowledged' ? 'badge-warning' : 'badge-success'
                  }`}>
                    {selectedAlert.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="content-card-body flex flex-col gap-5">
                {/* Victim Details */}
                <div className="bg-surface rounded-btn p-4 border border-border">
                  <div className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1">
                    Subject & Node ID
                  </div>
                  <div className="text-[16px] font-bold text-txt">{selectedAlert.deviceName}</div>
                  <div className="text-[12px] font-mono text-txt-secondary mt-0.5">
                    Hardware ID: {selectedAlert.deviceId}
                  </div>

                  {associatedNode && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-[11px]">
                      <div>
                        <span className="text-txt-secondary block">Battery</span>
                        <strong className="text-txt font-mono">{associatedNode.battery}%</strong>
                      </div>
                      <div>
                        <span className="text-txt-secondary block">Signal</span>
                        <strong className="text-txt font-mono">{associatedNode.rssi} dBm</strong>
                      </div>
                      <div>
                        <span className="text-txt-secondary block">Hops to Base</span>
                        <strong className="text-txt font-mono">{associatedNode.hops} hops</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Note & Automated AI Triage if attached */}
                {selectedAlert.voiceData && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-emergency" />
                        Victim Voice Note & AI Transcription
                      </span>
                      <span className="text-[10px] text-txt-secondary">
                        Blind / Illiterate Assistance
                      </span>
                    </div>
                    <VoiceNotePlayer voiceData={selectedAlert.voiceData} showTriage={true} />
                  </div>
                )}

                {/* Distress Payload text */}
                {!selectedAlert.voiceData && (
                  <div>
                    <div className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                      Transmitted LoRa Distress Payload
                    </div>
                    <div className="p-3.5 bg-card rounded-btn border border-border text-[13px] text-txt leading-relaxed font-mono">
                      "{selectedAlert.message}"
                    </div>
                  </div>
                )}

                {/* GPS Coordinates & Position */}
                <div className="p-3.5 bg-surface rounded-btn border border-border flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                      Target GPS Coordinates
                    </div>
                    <div className="font-mono text-[13px] font-bold text-txt mt-0.5">
                      {selectedAlert.lat.toFixed(6)}° N, {selectedAlert.lng.toFixed(6)}° E
                    </div>
                  </div>
                  <button
                    onClick={() => handleLocateOnMap(selectedAlert.deviceId)}
                    className="btn btn-sm btn-primary"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Open in Map
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  {/* Voice guidance reply to victim */}
                  <button
                    onClick={() => setReplyVoiceModalOpen(true)}
                    className="btn btn-sm bg-card border border-border justify-center w-full py-2.5 font-bold flex items-center gap-2 hover:bg-surface text-txt shadow-sm"
                  >
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span>Broadcast Voice Guidance to Victim</span>
                  </button>

                  {selectedAlert.status === 'active' && (
                    <button
                      onClick={() => acknowledgeAlert(selectedAlert.id)}
                      className="btn btn-primary justify-center w-full py-2.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      Acknowledge & Assign Incident
                    </button>
                  )}

                  {selectedAlert.status !== 'resolved' && (
                    <button
                      onClick={() => handleDispatchRescue(selectedAlert.id, selectedAlert.deviceName)}
                      className="btn btn-emergency justify-center w-full py-2.5"
                    >
                      <Send className="w-4 h-4" />
                      Dispatch Rescue Team Bravo
                    </button>
                  )}

                  {selectedAlert.status !== 'resolved' ? (
                    <button
                      onClick={() => resolveAlert(selectedAlert.id)}
                      className="btn justify-center w-full py-2"
                    >
                      <CheckCircle className="w-4 h-4 text-success" />
                      Mark Incident as Resolved
                    </button>
                  ) : (
                    <div className="p-3 bg-success-light rounded-btn text-success text-[12px] font-semibold text-center flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Incident Successfully Resolved & Logged
                    </div>
                  )}
                </div>

                {/* Incident Log Timeline */}
                <div className="pt-2 border-t border-border">
                  <div className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-3">
                    Incident Audit Trail
                  </div>
                  <div className="flex flex-col gap-2.5 text-[11px]">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emergency mt-1 shrink-0" />
                      <div>
                        <span className="font-mono text-txt-secondary">[{selectedAlert.timestamp}]</span> SOS Packet broadcast on LoRa mesh SF9 868MHz
                      </div>
                    </div>
                    {selectedAlert.voiceData && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                        <div>
                          <span className="font-mono text-txt-secondary">[{selectedAlert.timestamp}]</span> Codec2 voice frame ({selectedAlert.voiceData.duration}s) decompressed & STT transcribed at gateway
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-success mt-1 shrink-0" />
                      <div>
                        <span className="font-mono text-txt-secondary">[{selectedAlert.timestamp}]</span> Gateway Node-A1 decoded packet via Ridge Relay Alpha
                      </div>
                    </div>
                    {selectedAlert.status !== 'active' && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-txt mt-1 shrink-0" />
                        <div>
                          <span className="font-mono text-txt-secondary">[Operator Action]</span> Alert acknowledged by Base Camp Coordinator
                        </div>
                      </div>
                    )}
                    {selectedAlert.status === 'resolved' && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-success mt-1 shrink-0" />
                        <div>
                          <span className="font-mono text-txt-secondary">[Case Closed]</span> Field team confirmed subject safe
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="content-card p-8 text-center text-txt-secondary text-[13px]">
              Select an incident from the queue to view full dossier.
            </div>
          )}
        </div>
      </div>

      {/* Voice Reply Modal to Victim */}
      <VoiceRecorderModal
        isOpen={replyVoiceModalOpen}
        onClose={() => setReplyVoiceModalOpen(false)}
        defaultRecipient={selectedAlert?.deviceId || 'BROADCAST'}
      />
    </div>
  );
}
