import { useState } from 'react';
import {
  Radio, Zap, AlertTriangle, Wifi,
  ArrowUpRight, ArrowDownRight,
  Signal, Battery, MapPin, Clock,
  Activity, Mic
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import MapView from '../components/MapView';
import MeshTopology from '../components/MeshTopology';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import VoiceRecorderModal from '../components/VoiceRecorderModal';

const activityIcons: Record<string, { icon: typeof Radio; color: string }> = {
  node_discovered: { icon: Radio, color: '#2D8A56' },
  message_forwarded: { icon: Zap, color: '#2563EB' },
  gps_updated: { icon: MapPin, color: '#6B7280' },
  route_changed: { icon: Activity, color: '#D4920A' },
  node_disconnected: { icon: Wifi, color: '#E85D3F' },
  sos_delivered: { icon: AlertTriangle, color: '#E85D3F' },
  voice_note_received: { icon: Mic, color: '#2563EB' },
};

export default function Overview() {
  const { nodes, alerts, activity, acknowledgeAlert, selectNode, triggerVoiceSOS } = useApp();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const onlineNodes = nodes.filter(n => n.status !== 'offline').length;
  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const deliveryRate = '97.2';
  const gatewayNode = nodes.find(n => n.role === 'gateway');
  const voiceAlertsCount = alerts.filter(a => !!a.voiceData).length;

  return (
    <div className="px-4 md:px-6 pb-8">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Active Nodes */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Active Nodes</span>
            <div className="w-8 h-8 rounded-[10px] bg-surface flex items-center justify-center">
              <Radio className="w-4 h-4 text-txt-secondary" />
            </div>
          </div>
          <div className="metric-value text-txt">{onlineNodes}</div>
          <div className="flex items-center gap-1 mt-2 text-[12px] text-success font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+2 in last hour</span>
          </div>
        </div>

        {/* Network Delivery */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Delivery Rate</span>
            <div className="w-8 h-8 rounded-[10px] bg-surface flex items-center justify-center">
              <Signal className="w-4 h-4 text-txt-secondary" />
            </div>
          </div>
          <div className="metric-value text-txt">{deliveryRate}<span className="text-[18px] text-txt-secondary ml-1">%</span></div>
          <div className="flex items-center gap-1 mt-2 text-[12px] text-success font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+1.4% vs avg</span>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Active Alerts</span>
            <div className="w-8 h-8 rounded-[10px] bg-emergency-light flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-emergency" />
            </div>
          </div>
          <div className="metric-value text-emergency">{activeAlerts}</div>
          <div className="flex items-center gap-1 mt-2 text-[12px] text-emergency font-medium">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{voiceAlertsCount} with Voice Notes</span>
          </div>
        </div>

        {/* Gateway */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Gateway Status</span>
            <div className="w-8 h-8 rounded-[10px] bg-success-light flex items-center justify-center">
              <Wifi className="w-4 h-4 text-success" />
            </div>
          </div>
          <div className="metric-value text-success">Online</div>
          <div className="flex items-center gap-1 mt-2 text-[12px] text-txt-secondary font-medium">
            <Battery className="w-3.5 h-3.5" />
            <span>{gatewayNode?.battery ?? 94}% battery</span>
          </div>
        </div>
      </div>

      {/* Voice SOS Accessibility Banner for Blind / Illiterate Victims */}
      <div className="mb-6 p-4 rounded-card bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emergency-light text-emergency flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-txt">
              Emergency Voice Notes & Assistive Speech Triage
            </h3>
            <p className="text-[12px] text-txt-secondary">
              Voice notes enable blind, illiterate, or trapped individuals to speak for rescue. The rescue dashboard provides automatic audio playback, Speech-to-Text transcription, and AI triage extraction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="btn btn-sm btn-emergency flex items-center gap-1.5 shadow-sm"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Voice Note</span>
          </button>
          <button
            type="button"
            onClick={() => triggerVoiceSOS()}
            className="btn btn-sm bg-card border border-border text-txt hover:bg-surface"
          >
            Simulate Voice SOS
          </button>
        </div>
      </div>

      {/* Map + Mesh Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Map */}
        <div className="lg:col-span-7 content-card">
          <div className="content-card-header">
            <h2 className="text-[15px] font-bold text-txt">Live Device Map</h2>
            <span className="badge badge-neutral text-[10px]">SAMPLE DATA</span>
          </div>
          <div className="content-card-body p-0">
            <MapView height="420px" showControls={true} />
          </div>
        </div>

        {/* Mesh Topology */}
        <div className="lg:col-span-5 content-card">
          <div className="content-card-header">
            <h2 className="text-[15px] font-bold text-txt">Mesh Network Topology</h2>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-[11px] text-txt-secondary">8 nodes</span>
            </div>
          </div>
          <div className="content-card-body p-2 flex flex-col justify-between" style={{ height: 420 }}>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <MeshTopology compact={true} />
            </div>
            {/* Quick node selector chips */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {nodes.map(n => (
                <button
                  key={n.id}
                  onClick={() => selectNode(n.id)}
                  className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-full border transition-all ${
                    n.status === 'online'
                      ? 'border-success/30 text-success bg-success-light'
                      : n.status === 'degraded'
                      ? 'border-warning/30 text-warning bg-warning-light'
                      : 'border-border text-txt-secondary bg-surface'
                  }`}
                >
                  {n.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Alerts */}
        <div className="lg:col-span-7 content-card">
          <div className="content-card-header">
            <h2 className="text-[15px] font-bold text-txt">Emergency Alerts & Voice Distress</h2>
            <span className="text-[12px] font-semibold text-emergency">{activeAlerts} active</span>
          </div>
          <div className="content-card-body flex flex-col gap-3">
            {alerts.filter(a => a.status !== 'resolved').map(alert => (
              <div
                key={alert.id}
                className={`alert-item ${alert.priority === 'critical' && alert.status === 'active' ? 'critical' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {alert.voiceData && (
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
                      <span className="text-[11px] font-mono text-txt-secondary">{alert.id}</span>
                      <span className="text-[11px] text-txt-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.timestamp}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-txt mb-0.5">{alert.deviceName}</div>
                    <div className="text-[12px] text-txt-secondary">{alert.message}</div>

                    {/* Inline compact voice player if present */}
                    {alert.voiceData && (
                      <div className="my-2">
                        <VoiceNotePlayer voiceData={alert.voiceData} compact={true} showTriage={false} />
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      <span className="font-mono text-txt-secondary">
                        📍 {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </span>
                      <span className={`badge ${
                        alert.deliveryStatus === 'delivered' ? 'badge-success' :
                        alert.deliveryStatus === 'pending' ? 'badge-warning' : 'badge-emergency'
                      }`}>
                        {alert.deliveryStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="btn btn-sm btn-primary"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => selectNode(alert.deviceId)}
                      className="btn btn-sm"
                    >
                      <MapPin className="w-3 h-3" />
                      Locate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-5 content-card">
          <div className="content-card-header">
            <h2 className="text-[15px] font-bold text-txt">Recent Activity</h2>
          </div>
          <div className="content-card-body">
            {activity.map(item => {
              const cfg = activityIcons[item.type] || activityIcons.gps_updated;
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="timeline-item">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: cfg.color + '15' }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-txt leading-snug">{item.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-txt-secondary">{item.timestamp}</span>
                      {item.deviceId && (
                        <span className="text-[10px] font-mono text-txt-secondary bg-surface px-1.5 py-0.5 rounded">
                          {item.deviceId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
      />
    </div>
  );
}
