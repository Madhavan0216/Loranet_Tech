import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { demoNodes, demoAlerts, demoActivity, demoMessages, demoLinks } from '../data/demo';
import type { DeviceNode, Alert, ActivityItem, Message, MeshLink, VoiceData } from '../data/demo';
import { analyzeVoiceTranscript, speakText } from '../utils/audioUtils';

interface AppState {
  nodes: DeviceNode[];
  alerts: Alert[];
  activity: ActivityItem[];
  messages: Message[];
  links: MeshLink[];
  selectedNodeId: string | null;
  selectNode: (id: string | null) => void;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  simulateEmergencyAlert: () => void;
  sendMessage: (to: string, content: string, priority?: 'normal' | 'high' | 'emergency') => void;
  sendVoiceMessage: (
    to: string,
    transcript: string,
    duration: number,
    audioUrl?: string,
    priority?: 'normal' | 'high' | 'emergency',
    customTriage?: any
  ) => void;
  triggerVoiceSOS: (transcript?: string, duration?: number, audioUrl?: string) => void;
  speakVoice: (text: string) => void;
  pingNode: (id: string) => void;
  toasts: ToastItem[];
  addToast: (msg: string, type?: 'info' | 'success' | 'emergency') => void;
  removeToast: (id: number) => void;
}

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'emergency';
}

const AppContext = createContext<AppState | null>(null);

let toastCounter = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState(demoNodes);
  const [alerts, setAlerts] = useState(demoAlerts);
  const [activity, setActivity] = useState(demoActivity);
  const [messages, setMessages] = useState(demoMessages);
  const [links] = useState(demoLinks);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const addToast = useCallback((msg: string, type: 'info' | 'success' | 'emergency' = 'info') => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const speakVoice = useCallback((text: string) => {
    speakText(text);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' as const } : a)
    );
    addToast(`Alert ${alertId} acknowledged`, 'success');
  }, [addToast]);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, status: 'resolved' as const } : a)
    );
    addToast(`Alert ${alertId} resolved`, 'info');
  }, [addToast]);

  const simulateEmergencyAlert = useCallback(() => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newId = `ALT-00${alerts.length + 1}`;
    const newAlert: Alert = {
      id: newId,
      priority: 'critical',
      deviceId: 'NODE-E5',
      deviceName: 'Hiker — Priya S.',
      message: 'CRITICAL EMERGENCY: Biometric pulse anomaly detected via mesh tracker.',
      lat: 28.6180,
      lng: 83.9640,
      timestamp: timeStr,
      status: 'active',
      deliveryStatus: 'delivered',
    };
    setAlerts(prev => [newAlert, ...prev]);
    setActivity(prev => [
      {
        id: `ACT-${Date.now()}`,
        type: 'sos_delivered',
        description: `Simulated SOS from ${newAlert.deviceName} received at Gateway`,
        timestamp: timeStr,
        deviceId: newAlert.deviceId,
      },
      ...prev,
    ]);
    addToast(`CRITICAL SOS: ${newAlert.deviceName}`, 'emergency');
  }, [alerts.length, addToast]);

  const triggerVoiceSOS = useCallback((transcript?: string, duration: number = 7.5, audioUrl?: string) => {
    const defaultTranscript = transcript || 'EMERGENCY VOICE SOS: Trapped in collapsed structure near waypoint 3. Cannot move, water leaking into room. Please send rescue team immediately!';
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newAlertId = `ALT-00${alerts.length + 1}`;
    const triage = analyzeVoiceTranscript(defaultTranscript);

    const voiceData: VoiceData = {
      duration,
      transcript: defaultTranscript,
      audioUrl,
      isVoiceNote: true,
      aiTriage: triage,
    };

    const newAlert: Alert = {
      id: newAlertId,
      priority: 'critical',
      deviceId: 'NODE-F1',
      deviceName: 'Victim — Voice SOS Beacon',
      message: `VOICE SOS: "${defaultTranscript.slice(0, 75)}..."`,
      lat: 28.5825,
      lng: 83.9120,
      timestamp: timeStr,
      status: 'active',
      deliveryStatus: 'delivered',
      voiceData,
    };

    const newMsg: Message = {
      id: `MSG-${String(messages.length + 1).padStart(3, '0')}`,
      from: 'NODE-F1',
      to: 'NODE-A1',
      content: `[VOICE SOS NOTE] "${defaultTranscript}"`,
      priority: 'emergency',
      status: 'delivered',
      timestamp: timeStr,
      voiceData,
    };

    setAlerts(prev => [newAlert, ...prev]);
    setMessages(prev => [newMsg, ...prev]);
    setActivity(prev => [
      {
        id: `ACT-${Date.now()}`,
        type: 'voice_note_received',
        description: `Voice SOS note received & transcribed: "${defaultTranscript.slice(0, 45)}..."`,
        timestamp: timeStr,
        deviceId: 'NODE-F1',
      },
      ...prev,
    ]);

    addToast(`🚨 VOICE SOS RECEIVED: Extracted ${triage.victimCount} victim(s), ${triage.urgency.toUpperCase()} urgency!`, 'emergency');
    speakText(`Warning. Critical Voice SOS received from field node. Urgency: ${triage.urgency}. Automatic transcription available.`);
  }, [alerts.length, messages.length, addToast]);

  const sendMessage = useCallback((to: string, content: string, priority: 'normal' | 'high' | 'emergency' = 'normal') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newMsg: Message = {
      id: `MSG-${String(messages.length + 1).padStart(3, '0')}`,
      from: 'NODE-A1',
      to,
      content,
      priority,
      status: to === 'NODE-H9' ? 'store-forward' : 'delivered',
      timestamp: timeStr,
    };
    setMessages(prev => [newMsg, ...prev]);
    setActivity(prev => [
      {
        id: `ACT-${Date.now()}`,
        type: 'message_forwarded',
        description: `Message transmitted from Base Camp to ${to} (${priority} priority)`,
        timestamp: timeStr,
        deviceId: to,
      },
      ...prev,
    ]);
    addToast(`Message dispatched via LoRa mesh (${newMsg.status})`, 'success');
  }, [messages.length, addToast]);

  const sendVoiceMessage = useCallback((
    to: string,
    transcript: string,
    duration: number,
    audioUrl?: string,
    priority: 'normal' | 'high' | 'emergency' = 'emergency',
    customTriage?: any
  ) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const triage = customTriage || analyzeVoiceTranscript(transcript);

    const voiceData: VoiceData = {
      duration,
      transcript,
      audioUrl,
      isVoiceNote: true,
      aiTriage: triage,
    };

    const newMsg: Message = {
      id: `MSG-${String(messages.length + 1).padStart(3, '0')}`,
      from: 'NODE-A1',
      to,
      content: `[VOICE NOTE] "${transcript}"`,
      priority,
      status: to === 'NODE-H9' ? 'store-forward' : 'delivered',
      timestamp: timeStr,
      voiceData,
    };

    setMessages(prev => [newMsg, ...prev]);
    setActivity(prev => [
      {
        id: `ACT-${Date.now()}`,
        type: 'voice_note_received',
        description: `Voice note transmitted to ${to} (${duration.toFixed(1)}s audio)`,
        timestamp: timeStr,
        deviceId: to,
      },
      ...prev,
    ]);

    addToast(`Voice note transmitted across mesh (${newMsg.status})`, 'success');
  }, [messages.length, addToast]);

  const pingNode = useCallback((id: string) => {
    const target = nodes.find(n => n.id === id);
    if (!target) return;
    if (target.status === 'offline') {
      addToast(`Ping to ${id} timed out — node unreachable (offline)`, 'emergency');
    } else {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, lastSeen: 'Just now' } : n));
      addToast(`Ping reply from ${id} in ${Math.floor(Math.random() * 80 + 35)}ms (SNR ${target.snr}dB)`, 'success');
    }
  }, [nodes, addToast]);

  return (
    <AppContext.Provider value={{
      nodes, alerts, activity, messages, links,
      selectedNodeId, selectNode,
      acknowledgeAlert, resolveAlert, simulateEmergencyAlert,
      sendMessage, sendVoiceMessage, triggerVoiceSOS, speakVoice, pingNode,
      toasts, addToast, removeToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
