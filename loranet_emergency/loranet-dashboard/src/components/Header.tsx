import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, Shield, Menu, Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';
import VoiceRecorderModal from './VoiceRecorderModal';

const pageTitles: Record<string, { title: string; desc: string }> = {
  '/': { title: 'Overview', desc: 'Network status & emergency dashboard' },
  '/map': { title: 'Live Map', desc: 'GPS device locations & SOS markers' },
  '/mesh': { title: 'Mesh Network', desc: 'Topology, nodes & link quality' },
  '/alerts': { title: 'Emergency Alerts', desc: 'SOS alerts & incident management' },
  '/devices': { title: 'Devices', desc: 'Device inventory & health monitoring' },
  '/messages': { title: 'Messages', desc: 'Mesh communication log & voice notes' },
  '/settings': { title: 'Settings', desc: 'Network & system configuration' },
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const { alerts, addToast } = useApp();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const page = pageTitles[location.pathname] || pageTitles['/'];
  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button onClick={onMenuClick} className="p-1">
          <Menu className="w-5 h-5 text-txt" />
        </button>
        <span className="text-[14px] font-bold text-txt">{page.title}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm"
            title="Voice SOS (Accessibility for Blind/Illiterate)"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => addToast('SOS Broadcast initiated!', 'emergency')}
            className="btn-emergency btn-sm rounded-full"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-[22px] font-bold text-txt tracking-tight">{page.title}</h1>
          <p className="text-[13px] text-txt-secondary mt-0.5">{page.desc}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-[12px] text-txt-secondary">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{timeStr}</span>
            <span className="text-border">|</span>
            <span>{dateStr}</span>
          </div>

          {/* Mode badge */}
          {activeAlerts > 0 ? (
            <div className="badge badge-emergency">
              <div className="w-1.5 h-1.5 rounded-full bg-emergency pulse-dot" />
              Emergency Mode
            </div>
          ) : (
            <div className="badge badge-success">
              <Shield className="w-3 h-3" />
              Normal
            </div>
          )}

          {/* Gateway */}
          <div className="badge badge-success">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            Gateway Online
          </div>

          {/* Voice SOS (Accessibility Button for Blind/Illiterate) */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="btn btn-sm bg-card border border-border text-txt hover:bg-surface font-bold flex items-center gap-1.5 shadow-sm"
            title="Voice SOS: Record audio for blind, illiterate, or trapped victims"
          >
            <Mic className="w-3.5 h-3.5 text-emergency" />
            <span>Voice SOS</span>
          </button>

          {/* Standard SOS Button */}
          <button
            onClick={() => addToast('SOS Broadcast initiated — all nodes alerted!', 'emergency')}
            className="btn btn-emergency sos-pulse btn-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            SOS Broadcast
          </button>
        </div>
      </header>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
      />
    </>
  );
}
