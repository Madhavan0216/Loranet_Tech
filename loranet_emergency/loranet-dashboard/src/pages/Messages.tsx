import { useState } from 'react';
import {
  MessageSquare, Send, Clock, Radio, ArrowUpRight,
  ShieldAlert, RefreshCw, Inbox, Mic
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import VoiceRecorderModal from '../components/VoiceRecorderModal';

export default function Messages() {
  const { messages, nodes, selectedNodeId, sendMessage } = useApp();

  const [recipient, setRecipient] = useState<string>(selectedNodeId || 'BROADCAST');
  const [priority, setPriority] = useState<'normal' | 'high' | 'emergency'>('normal');
  const [content, setContent] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'normal' | 'high' | 'emergency' | 'voice'>('all');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const maxChars = 222; // LoRa payload limit

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage(recipient, content.trim(), priority);
    setContent('');
  };

  const filteredMessages = messages.filter(m => {
    if (filterPriority === 'voice') return !!m.voiceData;
    if (filterPriority === 'all') return true;
    return m.priority === filterPriority;
  });

  const storeForwardCount = messages.filter(m => m.status === 'store-forward').length;
  const emergencyCount = messages.filter(m => m.priority === 'emergency').length;
  const voiceNoteCount = messages.filter(m => !!m.voiceData).length;

  return (
    <div className="px-4 md:px-6 pb-8">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Total Messages</span>
            <div className="w-8 h-8 rounded-[10px] bg-surface flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-txt-secondary" />
            </div>
          </div>
          <div className="metric-value text-txt">{messages.length}</div>
          <div className="text-[12px] text-txt-secondary mt-1">Packets logged over mesh</div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Voice Notes (Audio)</span>
            <div className="w-8 h-8 rounded-[10px] bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="metric-value text-blue-600">{voiceNoteCount}</div>
          <div className="text-[12px] text-txt-secondary mt-1">Blind/illiterate voice notes</div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Emergency Packets</span>
            <div className="w-8 h-8 rounded-[10px] bg-emergency-light flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-emergency" />
            </div>
          </div>
          <div className="metric-value text-emergency">{emergencyCount}</div>
          <div className="text-[12px] text-emergency font-medium mt-1">High priority SOS traffic</div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <span className="metric-label">Store & Forward</span>
            <div className="w-8 h-8 rounded-[10px] bg-warning-light flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-warning" />
            </div>
          </div>
          <div className="metric-value text-warning">{storeForwardCount}</div>
          <div className="text-[12px] text-txt-secondary mt-1">Queued for disconnected nodes</div>
        </div>
      </div>

      {/* Main Grid: Message Feed (Left) & Compose Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Message Feed */}
        <div className="lg:col-span-7 content-card flex flex-col">
          <div className="content-card-header flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-txt-secondary" />
              <h2 className="text-[15px] font-bold text-txt">Mesh Radio Log</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="btn btn-sm btn-emergency flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Record Voice Note</span>
              </button>

              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <span className="text-[11px] text-txt-secondary uppercase">Filter:</span>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value as any)}
                  className="px-2.5 py-1 rounded-btn border border-border bg-card text-[12px] font-medium text-txt outline-none"
                >
                  <option value="all">All Traffic</option>
                  <option value="voice">🎙️ Voice Notes Only</option>
                  <option value="emergency">🚨 Emergency SOS</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>
          </div>

          <div className="content-card-body flex-1 overflow-y-auto flex flex-col gap-3">
            {filteredMessages.length === 0 ? (
              <div className="py-12 text-center text-txt-secondary text-[13px]">
                No messages found matching criteria.
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isEmergency = msg.priority === 'emergency';
                const hasVoice = !!msg.voiceData;

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-btn border border-border bg-card transition-all ${
                      isEmergency ? 'border-l-4 border-l-emergency bg-emergency-light/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-txt">{msg.from}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-txt-secondary" />
                        <span className="font-mono text-[12px] font-bold text-txt">
                          {msg.to === 'BROADCAST' ? 'MESH-BROADCAST' : msg.to}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasVoice && (
                          <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold flex items-center gap-1">
                            <Mic className="w-3 h-3" />
                            VOICE NOTE
                          </span>
                        )}
                        <span className={`badge ${
                          msg.priority === 'emergency' ? 'badge-emergency' :
                          msg.priority === 'high' ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {msg.priority.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-txt-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {msg.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* If voice note attached, render audio player */}
                    {hasVoice && msg.voiceData ? (
                      <div className="my-2">
                        <VoiceNotePlayer voiceData={msg.voiceData} />
                      </div>
                    ) : (
                      <div className="text-[13px] text-txt font-mono bg-surface p-2.5 rounded-btn border border-border leading-relaxed">
                        {msg.content}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2.5 text-[11px] text-txt-secondary">
                      <span className="font-mono">{msg.id}</span>
                      <span className={`badge ${
                        msg.status === 'delivered' ? 'badge-success' :
                        msg.status === 'pending' ? 'badge-warning' :
                        msg.status === 'store-forward' ? 'badge-warning' : 'badge-emergency'
                      }`}>
                        {msg.status === 'store-forward' ? 'Store & Forward (Queued)' : msg.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Compose Panel */}
        <div className="lg:col-span-5">
          <div className="content-card sticky top-6">
            <div className="content-card-header">
              <div>
                <span className="text-[11px] font-mono text-txt-secondary uppercase">Mesh Transmitter</span>
                <h2 className="text-[16px] font-bold text-txt">Transmit LoRa Message</h2>
              </div>
              <div className="badge badge-success">
                <Radio className="w-3 h-3" />
                Radio TX Ready
              </div>
            </div>

            <div className="p-4 border-b border-border bg-surface/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-txt flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-emergency" />
                  Voice Note & Blind Assistance
                </span>
                <span className="text-[10px] text-txt-secondary uppercase font-semibold">Special Feature</span>
              </div>
              <p className="text-[12px] text-txt-secondary mb-3 leading-relaxed">
                For blind, illiterate, or immobilized victims unable to type on keyboards during an emergency.
              </p>
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-btn bg-card border border-border text-txt font-bold text-[12px] flex items-center justify-center gap-2 hover:bg-white shadow-sm hover:border-active transition-all"
              >
                <Mic className="w-4 h-4 text-emergency" />
                <span>Open Voice Recorder & Presets</span>
              </button>
            </div>

            <form onSubmit={handleSend} className="content-card-body flex flex-col gap-4">
              {/* Recipient Node */}
              <div>
                <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                  Destination Node
                </label>
                <select
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-medium text-txt outline-none"
                >
                  <option value="BROADCAST">Broadcast to All Mesh Nodes (Flooding)</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.id} — {n.name} ({n.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-txt-secondary mt-1">
                  Packets automatically multi-hop through intermediate relay nodes.
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                  Packet Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`py-2 px-3 rounded-btn border text-[12px] font-semibold transition-all ${
                      priority === 'normal'
                        ? 'border-active bg-active text-white'
                        : 'border-border bg-card text-txt hover:bg-surface'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`py-2 px-3 rounded-btn border text-[12px] font-semibold transition-all ${
                      priority === 'high'
                        ? 'border-warning bg-warning text-white'
                        : 'border-border bg-card text-txt hover:bg-surface'
                    }`}
                  >
                    High
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('emergency')}
                    className={`py-2 px-3 rounded-btn border text-[12px] font-semibold transition-all ${
                      priority === 'emergency'
                        ? 'border-emergency bg-emergency text-white'
                        : 'border-border bg-card text-txt hover:bg-surface'
                    }`}
                  >
                    Emergency SOS
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                    Message Payload (ASCII)
                  </label>
                  <span className={`font-mono text-[11px] ${
                    content.length > maxChars ? 'text-emergency font-bold' : 'text-txt-secondary'
                  }`}>
                    {content.length} / {maxChars} bytes
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Enter message for field responders or victims..."
                  maxLength={maxChars}
                  className="w-full p-3 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none resize-none focus:border-active"
                />
              </div>

              {/* Radio Parameters Info */}
              <div className="p-3 bg-surface rounded-btn border border-border text-[11px] text-txt-secondary">
                <div className="flex justify-between py-0.5">
                  <span>Modulation:</span>
                  <span className="font-mono text-txt font-semibold">LoRa SF9 / 868.100 MHz</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Audio Codec:</span>
                  <span className="font-mono text-txt font-semibold">Codec2 (700 bps compressed)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Store-and-Forward:</span>
                  <span className="text-success font-semibold">Enabled (Node buffer)</span>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!content.trim()}
                className={`btn justify-center py-2.5 ${
                  priority === 'emergency' ? 'btn-emergency' : 'btn-primary'
                } disabled:opacity-50`}
              >
                <Send className="w-4 h-4" />
                Transmit Text over Mesh
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        defaultRecipient={recipient}
      />
    </div>
  );
}
