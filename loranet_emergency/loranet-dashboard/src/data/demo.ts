// =============================================
// LoraNet — Demo / Sample Data
// Clearly separated from UI for future API integration.
// =============================================

export interface DeviceNode {
  id: string;
  name: string;
  role: 'victim' | 'relay' | 'gateway' | 'rescue';
  lat: number;
  lng: number;
  battery: number;
  rssi: number;
  snr: number;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: string;
  hops: number;
}

export interface VoiceData {
  audioUrl?: string;
  duration: number; // in seconds
  transcript: string;
  isVoiceNote: boolean;
  aiTriage?: {
    urgency: 'critical' | 'high' | 'moderate';
    extractedNeed: string;
    victimCount: number;
    injuriesReported?: string;
    hazards?: string[];
    recommendedAction: string;
  };
}

export interface Alert {
  id: string;
  priority: 'critical' | 'high' | 'medium';
  deviceId: string;
  deviceName: string;
  message: string;
  lat: number;
  lng: number;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  deliveryStatus: 'delivered' | 'pending' | 'failed';
  voiceData?: VoiceData;
}

export interface ActivityItem {
  id: string;
  type: 'node_discovered' | 'message_forwarded' | 'gps_updated' | 'route_changed' | 'node_disconnected' | 'sos_delivered' | 'voice_note_received';
  description: string;
  timestamp: string;
  deviceId?: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  priority: 'normal' | 'high' | 'emergency';
  status: 'delivered' | 'pending' | 'failed' | 'store-forward';
  timestamp: string;
  voiceData?: VoiceData;
}

// ---- NODES ----
export const demoNodes: DeviceNode[] = [
  {
    id: 'NODE-A1',
    name: 'Base Camp Gateway',
    role: 'gateway',
    lat: 28.5946,
    lng: 83.9310,
    battery: 94,
    rssi: -42,
    snr: 12.5,
    status: 'online',
    lastSeen: '2 min ago',
    hops: 0,
  },
  {
    id: 'NODE-B3',
    name: 'Ridge Relay Alpha',
    role: 'relay',
    lat: 28.6020,
    lng: 83.9450,
    battery: 71,
    rssi: -78,
    snr: 8.2,
    status: 'online',
    lastSeen: '1 min ago',
    hops: 1,
  },
  {
    id: 'NODE-C7',
    name: 'Valley Relay Beta',
    role: 'relay',
    lat: 28.5870,
    lng: 83.9180,
    battery: 58,
    rssi: -85,
    snr: 6.1,
    status: 'degraded',
    lastSeen: '5 min ago',
    hops: 2,
  },
  {
    id: 'NODE-D2',
    name: 'Rescue Team Bravo',
    role: 'rescue',
    lat: 28.6100,
    lng: 83.9550,
    battery: 82,
    rssi: -65,
    snr: 10.4,
    status: 'online',
    lastSeen: '30 sec ago',
    hops: 1,
  },
  {
    id: 'NODE-E5',
    name: 'Hiker — Priya S.',
    role: 'victim',
    lat: 28.6150,
    lng: 83.9620,
    battery: 23,
    rssi: -94,
    snr: 3.8,
    status: 'online',
    lastSeen: '8 min ago',
    hops: 3,
  },
  {
    id: 'NODE-F1',
    name: 'Climber — Arjun K.',
    role: 'victim',
    lat: 28.5800,
    lng: 83.9080,
    battery: 12,
    rssi: -101,
    snr: 1.9,
    status: 'degraded',
    lastSeen: '14 min ago',
    hops: 4,
  },
  {
    id: 'NODE-G4',
    name: 'Rescue Team Alpha',
    role: 'rescue',
    lat: 28.5980,
    lng: 83.9350,
    battery: 90,
    rssi: -55,
    snr: 11.0,
    status: 'online',
    lastSeen: '1 min ago',
    hops: 1,
  },
  {
    id: 'NODE-H9',
    name: 'South Ridge Relay',
    role: 'relay',
    lat: 28.5750,
    lng: 83.9250,
    battery: 45,
    rssi: -89,
    snr: 5.5,
    status: 'offline',
    lastSeen: '32 min ago',
    hops: 3,
  },
];

// ---- ALERTS ----
export const demoAlerts: Alert[] = [
  {
    id: 'ALT-001',
    priority: 'critical',
    deviceId: 'NODE-F1',
    deviceName: 'Climber — Arjun K.',
    message: 'VOICE SOS — Fall detected off ridge. Fractured lower limb, severe immobility.',
    lat: 28.5800,
    lng: 83.9080,
    timestamp: '14:32:18',
    status: 'active',
    deliveryStatus: 'delivered',
    voiceData: {
      duration: 6.2,
      transcript: 'Help, I had a bad fall near the ridge trail! My leg is injured and bleeding, I cannot walk. Battery is low, please hurry!',
      isVoiceNote: true,
      aiTriage: {
        urgency: 'critical',
        extractedNeed: 'Fall impact on ridge, leg fracture & bleeding wound. Total immobility.',
        victimCount: 1,
        injuriesReported: 'Lower limb fracture / Active bleeding',
        hazards: ['Vertical cliff / Steep terrain', 'Freezing exposure'],
        recommendedAction: 'Immediate airborne / advanced medical extraction (Stretcher & Trauma Kit required)',
      },
    },
  },
  {
    id: 'ALT-002',
    priority: 'critical',
    deviceId: 'NODE-E5',
    deviceName: 'Hiker — Priya S.',
    message: 'VOICE SOS — Visually impaired victim lost trail marker after storm.',
    lat: 28.6150,
    lng: 83.9620,
    timestamp: '14:28:45',
    status: 'active',
    deliveryStatus: 'pending',
    voiceData: {
      duration: 7.8,
      transcript: 'Emergency, I am visually impaired and lost my guide cane on the trail. I am staying in place near running water. Please send rescue team.',
      isVoiceNote: true,
      aiTriage: {
        urgency: 'high',
        extractedNeed: 'Visually impaired hiker lost navigation markers, holding position near stream.',
        victimCount: 1,
        injuriesReported: 'Visual impairment / Sensory disorientation',
        hazards: ['Zero-visibility terrain', 'Cold exposure'],
        recommendedAction: 'Ground rescue vector with thermal imaging and audio beacon guidance',
      },
    },
  },
  {
    id: 'ALT-003',
    priority: 'high',
    deviceId: 'NODE-H9',
    deviceName: 'South Ridge Relay',
    message: 'Node offline — no heartbeat for 32 minutes. Possible hardware failure.',
    lat: 28.5750,
    lng: 83.9250,
    timestamp: '14:15:02',
    status: 'acknowledged',
    deliveryStatus: 'failed',
  },
  {
    id: 'ALT-004',
    priority: 'medium',
    deviceId: 'NODE-C7',
    deviceName: 'Valley Relay Beta',
    message: 'Degraded signal quality — SNR below threshold, packet loss increasing.',
    lat: 28.5870,
    lng: 83.9180,
    timestamp: '13:58:30',
    status: 'resolved',
    deliveryStatus: 'delivered',
  },
];

// ---- ACTIVITY LOG ----
export const demoActivity: ActivityItem[] = [
  {
    id: 'ACT-01',
    type: 'sos_delivered',
    description: 'SOS from Arjun K. delivered to Base Camp Gateway',
    timestamp: '14:32:20',
    deviceId: 'NODE-F1',
  },
  {
    id: 'ACT-02',
    type: 'node_disconnected',
    description: 'South Ridge Relay lost connection',
    timestamp: '14:15:02',
    deviceId: 'NODE-H9',
  },
  {
    id: 'ACT-03',
    type: 'message_forwarded',
    description: 'Emergency message relayed via Ridge Relay Alpha',
    timestamp: '14:12:55',
    deviceId: 'NODE-B3',
  },
  {
    id: 'ACT-04',
    type: 'gps_updated',
    description: 'GPS position updated for Rescue Team Bravo',
    timestamp: '14:10:30',
    deviceId: 'NODE-D2',
  },
  {
    id: 'ACT-05',
    type: 'route_changed',
    description: 'Mesh route recalculated — new path via Valley Relay Beta',
    timestamp: '14:05:18',
    deviceId: 'NODE-C7',
  },
  {
    id: 'ACT-06',
    type: 'node_discovered',
    description: 'New node discovered: Rescue Team Alpha joined mesh',
    timestamp: '13:55:42',
    deviceId: 'NODE-G4',
  },
  {
    id: 'ACT-07',
    type: 'gps_updated',
    description: 'GPS fix acquired for Hiker Priya S.',
    timestamp: '13:48:10',
    deviceId: 'NODE-E5',
  },
  {
    id: 'ACT-08',
    type: 'message_forwarded',
    description: 'Status check relayed to all nodes (broadcast)',
    timestamp: '13:40:00',
  },
];

// ---- MESSAGES ----
export const demoMessages: Message[] = [
  {
    id: 'MSG-001',
    from: 'NODE-F1',
    to: 'NODE-A1',
    content: '[VOICE NOTE] "Help, I had a bad fall near the ridge trail! My leg is injured and bleeding, I cannot walk. Battery is low, please hurry!"',
    priority: 'emergency',
    status: 'delivered',
    timestamp: '14:32:18',
    voiceData: {
      duration: 6.2,
      transcript: 'Help, I had a bad fall near the ridge trail! My leg is injured and bleeding, I cannot walk. Battery is low, please hurry!',
      isVoiceNote: true,
      aiTriage: {
        urgency: 'critical',
        extractedNeed: 'Fall impact on ridge, leg fracture & bleeding wound. Total immobility.',
        victimCount: 1,
        injuriesReported: 'Lower limb fracture / Active bleeding',
        hazards: ['Vertical cliff / Steep terrain', 'Freezing exposure'],
        recommendedAction: 'Immediate airborne / advanced medical extraction (Stretcher & Trauma Kit required)',
      },
    },
  },
  {
    id: 'MSG-002',
    from: 'NODE-E5',
    to: 'NODE-A1',
    content: '[VOICE NOTE] "Emergency, I am visually impaired and lost my guide cane on the trail. I am staying in place near running water. Please send rescue team."',
    priority: 'emergency',
    status: 'pending',
    timestamp: '14:28:45',
    voiceData: {
      duration: 7.8,
      transcript: 'Emergency, I am visually impaired and lost my guide cane on the trail. I am staying in place near running water. Please send rescue team.',
      isVoiceNote: true,
      aiTriage: {
        urgency: 'high',
        extractedNeed: 'Visually impaired hiker lost navigation markers, holding position near stream.',
        victimCount: 1,
        injuriesReported: 'Visual impairment / Sensory disorientation',
        hazards: ['Zero-visibility terrain', 'Cold exposure'],
        recommendedAction: 'Ground rescue vector with thermal imaging and audio beacon guidance',
      },
    },
  },
  {
    id: 'MSG-003',
    from: 'NODE-A1',
    to: 'NODE-D2',
    content: 'Rescue Team Bravo — proceed to coordinates 28.5800, 83.9080 for SOS. Victim is immobile.',
    priority: 'high',
    status: 'delivered',
    timestamp: '14:33:05',
  },
  {
    id: 'MSG-004',
    from: 'NODE-G4',
    to: 'NODE-A1',
    content: 'Alpha team in position. Awaiting further instructions.',
    priority: 'normal',
    status: 'delivered',
    timestamp: '14:00:12',
  },
  {
    id: 'MSG-005',
    from: 'NODE-A1',
    to: 'NODE-H9',
    content: 'Status check — please respond with health report.',
    priority: 'normal',
    status: 'store-forward',
    timestamp: '14:16:00',
  },
  {
    id: 'MSG-006',
    from: 'NODE-A1',
    to: 'NODE-E5',
    content: '[VOICE GUIDANCE] "Priya, this is Base Camp Rescue. Stay calm and stay by the stream. Team Bravo is en route with audio horns. Sound horn twice when you hear them."',
    priority: 'high',
    status: 'delivered',
    timestamp: '14:35:10',
    voiceData: {
      duration: 8.5,
      transcript: 'Priya, this is Base Camp Rescue. Stay calm and stay by the stream. Team Bravo is en route with audio horns. Sound horn twice when you hear them.',
      isVoiceNote: true,
      aiTriage: {
        urgency: 'high',
        extractedNeed: 'Spoken navigation and safety instructions transmitted to visually impaired victim.',
        victimCount: 1,
        recommendedAction: 'Audio beacon signaling enabled on rescue team vehicle',
      },
    },
  },
];

// ---- MESH CONNECTIONS ----
export interface MeshLink {
  from: string;
  to: string;
  quality: 'strong' | 'moderate' | 'weak' | 'broken';
  rssi: number;
}

export const demoLinks: MeshLink[] = [
  { from: 'NODE-A1', to: 'NODE-B3', quality: 'strong', rssi: -52 },
  { from: 'NODE-A1', to: 'NODE-G4', quality: 'strong', rssi: -55 },
  { from: 'NODE-A1', to: 'NODE-C7', quality: 'moderate', rssi: -78 },
  { from: 'NODE-B3', to: 'NODE-D2', quality: 'strong', rssi: -60 },
  { from: 'NODE-B3', to: 'NODE-E5', quality: 'weak', rssi: -94 },
  { from: 'NODE-C7', to: 'NODE-F1', quality: 'weak', rssi: -98 },
  { from: 'NODE-C7', to: 'NODE-H9', quality: 'broken', rssi: -110 },
  { from: 'NODE-G4', to: 'NODE-D2', quality: 'strong', rssi: -48 },
];
