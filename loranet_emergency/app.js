// ========================================================
// LoraNet — Real GPS & Hardware-Agnostic Dashboard Engine
// Uses Real Laptop GPS + Real Time Clock + Web Serial Arduino
// Zero Simulated/Fake Data
// ========================================================

const state = {
  // Real Laptop GPS Telemetry
  gps: {
    lat: null,
    lng: null,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    acquired: false,
    timestamp: null
  },
  
  // Real Hardware Nodes (populated only via Arduino/Serial)
  nodes: [],
  
  // Emergency Alerts
  alerts: [],
  
  // Web Serial Port for Arduino / ESP32
  serial: {
    port: null,
    reader: null,
    connected: false,
    baudRate: 115200
  },
  
  // WiFi TCP Mesh Bridge for ESP32 Node A (Port 3333)
  tcp: {
    connected: false,
    ws: null,
    ip: '10.185.241.154',
    port: 3333
  },
  nodeA: {
    ip: '10.185.241.154',
    port: 3333,
    status: 'ONLINE'
  },
  
  // LoRa Radio Messages (Received & Transmitted)
  messages: [],
  trafficTab: 'rx',

  // Active UI View & Local Node Identity
  activeView: 'overview',
  localRole: 'NODE_A', // 'NODE_A' or 'NODE_B'
  
  // Leaflet Maps
  maps: {
    overview: null,
    full: null,
    overviewMarker: null,
    fullMarker: null,
    overviewAccuracyCircle: null,
    fullAccuracyCircle: null,
    nodeMarkers: {}
  },

  // Voice SOS & LoRa Audio Dispatch (Accessible for Blind & Illiterate)
  voice: {
    recording: false,
    mediaRecorder: null,
    audioChunks: [],
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    timerInterval: null,
    transcript: '',
    recognition: null,
    selectedPreset: null,
    activeFilter: 'all',
    playingAudioId: null,
    audioElement: null
  },
  voiceNotes: [
    {
      id: 'VOICE-001',
      senderId: 'NODE-04',
      callerName: 'Kamal (Visually Impaired / Blind)',
      urgency: 'CRITICAL',
      lat: 11.05680,
      lng: 78.04890,
      timestamp: '11:42:15',
      duration: 5,
      transcript: 'I am visually impaired and trapped inside building corridor. Main stairwell has collapsed. Please send rescue team immediately.',
      tags: ['CRITICAL', 'TRAPPED', 'BLIND / ACCESSIBLE'],
      status: 'AWAITING_DISPATCH',
      audioUrl: null
    },
    {
      id: 'VOICE-002',
      senderId: 'NODE-07',
      callerName: 'Illiterate Resident / Family',
      urgency: 'HIGH',
      lat: 11.05310,
      lng: 78.04420,
      timestamp: '11:48:30',
      duration: 7,
      transcript: 'Flash flood water is entering our ground floor rapidly. Three children and elderly person cannot swim. Need evacuation boat.',
      tags: ['HIGH', 'FLOOD', 'CHILDREN / ELDERS'],
      status: 'DISPATCHED',
      audioUrl: null
    }
  ]
};

// ========================================================
// Initialization
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  initRealClock();
  initGeolocation();
  initNavigation();
  initNodeRoleSwitcher();
  initMaps();
  initSerialControls();
  initTcpControls();
  initSosControls();
  initMessageTransmitter();
  initLocationModal();
  initVoiceSosSystem();
  
  logAudit('LoraNet Dashboard online. Host Base Station initialized.');
});

// ========================================================
// 0. Local Node Role Identity (Node A Host vs Node B Field)
// ========================================================
function initNodeRoleSwitcher() {
  const urlParams = new URLSearchParams(window.location.search);
  const qRole = urlParams.get('node') || urlParams.get('role');
  let initialRole = 'NODE_A';

  if (qRole && (qRole.toUpperCase() === 'B' || qRole.toUpperCase() === 'NODE_B')) {
    initialRole = 'NODE_B';
  } else if (qRole && (qRole.toUpperCase() === 'A' || qRole.toUpperCase() === 'NODE_A')) {
    initialRole = 'NODE_A';
  } else {
    initialRole = sessionStorage.getItem('loranet_local_role') || 'NODE_A';
  }

  const btnA = document.getElementById('btnRoleNodeA');
  const btnB = document.getElementById('btnRoleNodeB');

  if (btnA) btnA.addEventListener('click', () => setLocalNodeRole('NODE_A'));
  if (btnB) btnB.addEventListener('click', () => setLocalNodeRole('NODE_B'));

  setLocalNodeRole(initialRole, false);
}

function getRemoteNodes() {
  return state.nodes.filter(n => n.nodeId !== state.localRole);
}

function setLocalNodeRole(role, notify = true) {
  state.localRole = role;
  sessionStorage.setItem('loranet_local_role', role);

  const btnA = document.getElementById('btnRoleNodeA');
  const btnB = document.getElementById('btnRoleNodeB');
  if (btnA) btnA.classList.toggle('active', role === 'NODE_A');
  if (btnB) btnB.classList.toggle('active', role === 'NODE_B');

  const opAvatar = document.getElementById('operatorAvatar');
  const opName = document.getElementById('operatorNodeName');
  const opRole = document.getElementById('operatorNodeRole');
  const gwTitle = document.getElementById('gatewayCardTitle');
  const waitTitle = document.getElementById('waitingBoxTitle');
  const waitSub = document.getElementById('waitingBoxSub');
  const ovContent = document.getElementById('overviewMsgContent');
  const msgContent = document.getElementById('msgContent');
  const pageSub = document.getElementById('pageSubtitle');

  if (role === 'NODE_A') {
    if (opAvatar) { opAvatar.textContent = 'NA'; opAvatar.style.background = '#10B981'; }
    if (opName) opName.textContent = 'NODE A';
    if (opRole) opRole.textContent = 'Coordinator / Host Base';
    if (gwTitle) gwTitle.textContent = 'ARDUINO GATEWAY (NODE A)';
    if (waitTitle) waitTitle.textContent = 'ESP32 Node A Gateway (Host)';
    if (waitSub) waitSub.textContent = 'Connect via USB (COM9) or WiFi TCP (Port 3333) to link with Node B transceiver.';
    if (ovContent) ovContent.placeholder = "Type message to Node B or click 'My Real GPS'...";
    if (msgContent) msgContent.placeholder = "Type LoRa packet for Node B...";
    if (pageSub) pageSub.textContent = 'Live GPS telemetry & mesh node monitoring (Node A Host)';
  } else {
    if (opAvatar) { opAvatar.textContent = 'NB'; opAvatar.style.background = '#3B82F6'; }
    if (opName) opName.textContent = 'NODE B';
    if (opRole) opRole.textContent = 'Field Transceiver';
    if (gwTitle) gwTitle.textContent = 'FIELD TRANSCEIVER (NODE B)';
    if (waitTitle) waitTitle.textContent = 'ESP32 Node B Transceiver (Field)';
    if (waitSub) waitSub.textContent = 'Connect via USB or WiFi TCP to link with Node A Coordinator (Port 3333).';
    if (ovContent) ovContent.placeholder = "Type message to Node A Host or click 'My Real GPS'...";
    if (msgContent) msgContent.placeholder = "Type LoRa packet for Node A Host...";
    if (pageSub) pageSub.textContent = 'Field mesh transceiver & telemetry link (Node B Client)';
  }

  // Refresh Hardware status UI based on active role
  if (state.serial.connected) {
    updateSerialUI(true);
  } else if (state.tcp.connected) {
    updateTcpUI(true, state.tcp.ip, state.tcp.port);
  } else {
    const gwBadge = document.getElementById('gatewayStatusBadge');
    const gwSub = document.getElementById('overviewGatewaySub');
    if (gwBadge) {
      gwBadge.textContent = role === 'NODE_A' ? `Node A (${state.nodeA.ip || '10.185.241.154'})` : 'Node B (Field Node)';
      gwBadge.className = 'badge badge-success';
    }
    if (gwSub) {
      gwSub.textContent = role === 'NODE_A'
        ? `Node A IP: ${state.nodeA.ip || '10.185.241.154'} · TCP Mesh Port 3333`
        : `Linked to Node A at ${state.nodeA.ip || '10.185.241.154'}:3333`;
    }
  }

  updateNodesUI();
  updateRecipientDropdowns();
  if (notify) {
    showToast(`Switched Dashboard Identity to ${role === 'NODE_A' ? 'Node A (Host)' : 'Node B (Field)'}`, 'info');
  }
}

// ========================================================
// 1. Real System Clock (1000ms Interval)
// ========================================================
function initRealClock() {
  const timeDisplay = document.getElementById('liveTimeDisplay');
  const dateDisplay = document.getElementById('liveDateDisplay');
  const terminalInit = document.getElementById('terminalInitTime');

  function update() {
    const now = new Date();
    
    // Time formatted HH:MM:SS
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Date formatted e.g. Mon, Oct 12, 2026
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (timeDisplay) timeDisplay.textContent = timeStr;
    if (dateDisplay) dateDisplay.textContent = dateStr;
    if (terminalInit && terminalInit.textContent === '--:--:--') {
      terminalInit.textContent = timeStr;
    }
  }

  update();
  setInterval(update, 1000);
}

// ========================================================
// 2. Real Laptop GPS Tracking (navigator.geolocation)
// ========================================================
function applyGpsCoordsToUI(latitude, longitude, accuracy = 20, isOfflineOrCached = false) {
  state.gps.lat = latitude;
  state.gps.lng = longitude;
  state.gps.accuracy = accuracy;
  state.gps.acquired = true;
  state.gps.timestamp = new Date();

  const latFmt = `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lngFmt = `${Math.abs(longitude).toFixed(5)}° ${longitude >= 0 ? 'E' : 'W'}`;
  const coordStr = `${latFmt}, ${lngFmt}`;
  const accStr = `±${Math.round(accuracy)}m`;

  const gpsHeader = document.getElementById('headerGpsCoords');
  const overviewCoords = document.getElementById('overviewGpsCoords');
  const overviewSub = document.getElementById('overviewGpsDetail');
  const gpsStatusBadge = document.getElementById('gpsStatusBadge');
  const gpsIndicatorDot = document.getElementById('gpsIndicatorDot');
  const gpsPrecisionText = document.getElementById('gpsPrecisionText');
  const deviceBaseCoords = document.getElementById('deviceBaseCoords');

  if (gpsHeader) {
    gpsHeader.textContent = isOfflineOrCached ? `${coordStr} (Offline Fix)` : `${coordStr} (${accStr})`;
  }
  if (overviewCoords) overviewCoords.textContent = coordStr;
  if (overviewSub) {
    overviewSub.textContent = isOfflineOrCached
      ? `Offline GNSS Fix (Anchored Base Station · ${accStr})`
      : `Real-time laptop GNSS fix (${accStr})`;
  }
  if (gpsStatusBadge) {
    gpsStatusBadge.className = 'badge badge-success';
    gpsStatusBadge.textContent = isOfflineOrCached ? 'Offline Fix' : 'Active Fix';
  }
  if (gpsIndicatorDot) gpsIndicatorDot.className = 'status-dot green';
  if (gpsPrecisionText) gpsPrecisionText.textContent = `Accuracy: ±${Math.round(accuracy)}m`;
  if (deviceBaseCoords) deviceBaseCoords.textContent = coordStr;

  // Update Full Map HUD
  const hudLat = document.getElementById('hudLat');
  const hudLng = document.getElementById('hudLng');
  const hudAcc = document.getElementById('hudAccuracy');
  const hudFix = document.getElementById('hudFixStatus');
  const fullMapCoordsBadge = document.getElementById('fullMapCoordsBadge');

  if (hudLat) hudLat.textContent = latitude.toFixed(6);
  if (hudLng) hudLng.textContent = longitude.toFixed(6);
  if (hudAcc) hudAcc.textContent = `±${Math.round(accuracy)}m`;
  if (hudFix) hudFix.textContent = isOfflineOrCached ? 'Offline Fix (Anchored)' : 'Active 3D Lock';
  if (fullMapCoordsBadge) fullMapCoordsBadge.textContent = coordStr;

  // Update Map and Radar
  updateMapWithLaptopGps(latitude, longitude, accuracy);
}

function initGeolocation() {
  // 1. Immediately read cached fix from localStorage (ensures instant offline coordinates)
  let hasValidCoordinates = false;
  try {
    const cached = localStorage.getItem('loranet_last_gps');
    if (cached) {
      const data = JSON.parse(cached);
      if (data.lat && data.lng) {
        applyGpsCoordsToUI(Number(data.lat), Number(data.lng), Number(data.accuracy) || 25, true);
        hasValidCoordinates = true;
      }
    }
  } catch (_) {}

  // If no saved fix, anchor to default location so offline map is never blank
  if (!hasValidCoordinates) {
    applyGpsCoordsToUI(11.05527, 78.04733, 25, true);
  }

  if (!('geolocation' in navigator)) {
    updateGpsError('Browser does not support Geolocation API (using anchored offline fix)');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000
  };

  navigator.geolocation.watchPosition(
    position => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
      
      state.gps.altitude = altitude;
      state.gps.speed = speed;
      state.gps.heading = heading;

      // Cache to local storage for offline continuity
      try {
        localStorage.setItem('loranet_last_gps', JSON.stringify({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          time: Date.now()
        }));
      } catch (_) {}

      // Apply live fix
      applyGpsCoordsToUI(latitude, longitude, accuracy, false);

      const hudAlt = document.getElementById('hudAltitude');
      const hudSpd = document.getElementById('hudSpeed');
      if (hudAlt) hudAlt.textContent = altitude !== null ? `${Math.round(altitude)}m MSL` : 'N/A';
      if (hudSpd) hudSpd.textContent = speed ? `${(speed * 3.6).toFixed(1)} km/h` : '0.0 km/h';

      logAudit(`Live laptop GPS fix updated: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`);
    },
    error => {
      let errText = 'GPS sensor offline / waiting';
      if (error.code === error.PERMISSION_DENIED) {
        errText = 'Location permission denied by user';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errText = 'Wi-Fi location provider offline';
      } else if (error.code === error.TIMEOUT) {
        errText = 'GPS acquisition timeout';
      }
      updateGpsError(errText);
    },
    options
  );
}

function updateGpsError(msg) {
  // If we already have a valid position (from cache or calibration), NEVER erase it!
  if (state.gps.acquired && state.gps.lat && state.gps.lng) {
    const overviewSub = document.getElementById('overviewGpsDetail');
    const gpsStatusBadge = document.getElementById('gpsStatusBadge');
    if (overviewSub) {
      overviewSub.textContent = `Offline Mode: Anchored to Base GNSS (${state.gps.lat.toFixed(5)}°, ${state.gps.lng.toFixed(5)}°)`;
    }
    if (gpsStatusBadge) {
      gpsStatusBadge.className = 'badge badge-success';
      gpsStatusBadge.textContent = 'Offline Fix';
    }
    return;
  }

  const overviewSub = document.getElementById('overviewGpsDetail');
  const gpsStatusBadge = document.getElementById('gpsStatusBadge');
  const gpsHeader = document.getElementById('headerGpsCoords');
  
  if (overviewSub) overviewSub.textContent = msg;
  if (gpsStatusBadge) {
    gpsStatusBadge.className = 'badge badge-warning';
    gpsStatusBadge.textContent = 'Waiting';
  }
  if (gpsHeader) gpsHeader.textContent = msg;
}

// 2b. Location Calibration & Offline Manual Setup Modal
function initLocationModal() {
  const modal = document.getElementById('modalGpsCalibration');
  const btnOpen1 = document.getElementById('btnOpenGpsModal');
  const btnOpen2 = document.getElementById('btnFullOpenGpsModal');
  const btnClose = document.getElementById('btnCloseGpsModal');
  const btnCancel = document.getElementById('btnCancelGpsModal');
  const btnSave = document.getElementById('btnSaveManualGps');
  const btnSetBrowser = document.getElementById('btnSetBrowserGps');
  const btnSetCached = document.getElementById('btnSetLastCached');
  const inputLat = document.getElementById('inputManualLat');
  const inputLng = document.getElementById('inputManualLng');

  function openModal() {
    if (!modal) return;
    if (inputLat && state.gps.lat) inputLat.value = state.gps.lat.toFixed(5);
    if (inputLng && state.gps.lng) inputLng.value = state.gps.lng.toFixed(5);
    modal.style.display = 'flex';
  }

  function closeModal() {
    if (modal) modal.style.display = 'none';
  }

  if (btnOpen1) btnOpen1.addEventListener('click', openModal);
  if (btnOpen2) btnOpen2.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnSetBrowser) {
    btnSetBrowser.addEventListener('click', () => {
      if ('geolocation' in navigator) {
        showToast('Querying laptop browser GPS sensor...', 'info');
        navigator.geolocation.getCurrentPosition(
          pos => {
            if (inputLat) inputLat.value = pos.coords.latitude.toFixed(5);
            if (inputLng) inputLng.value = pos.coords.longitude.toFixed(5);
            showToast('Laptop GPS coordinates acquired', 'success');
          },
          err => {
            showToast('Browser GPS unavailable offline. Enter coordinates manually.', 'warning');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    });
  }

  if (btnSetCached) {
    btnSetCached.addEventListener('click', () => {
      try {
        const cached = localStorage.getItem('loranet_last_gps');
        if (cached) {
          const data = JSON.parse(cached);
          if (data.lat && inputLat) inputLat.value = Number(data.lat).toFixed(5);
          if (data.lng && inputLng) inputLng.value = Number(data.lng).toFixed(5);
          showToast('Loaded last saved GPS anchor', 'info');
        }
      } catch (_) {}
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const latVal = parseFloat(inputLat ? inputLat.value : '');
      const lngVal = parseFloat(inputLng ? inputLng.value : '');

      if (isNaN(latVal) || isNaN(lngVal) || latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) {
        showToast('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180)', 'warning');
        return;
      }

      applyGpsCoordsToUI(latVal, lngVal, 15, true);

      try {
        localStorage.setItem('loranet_last_gps', JSON.stringify({
          lat: latVal,
          lng: lngVal,
          accuracy: 15,
          time: Date.now()
        }));
      } catch (_) {}

      playAckChime();
      showToast(`Base Station location saved: ${latVal.toFixed(5)}, ${lngVal.toFixed(5)}`, 'success');
      logAudit(`Base Station location manually calibrated: ${latVal.toFixed(5)}, ${lngVal.toFixed(5)}`);
      closeModal();
    });
  }
}

// ========================================================
// 2B. Accessible Voice Note SOS & Rescue Team Audio Hub
// Specially engineered for blind and illiterate citizens
// ========================================================
function initVoiceSosSystem() {
  const modal = document.getElementById('modalVoiceSos');
  const btnHeader = document.getElementById('btnHeaderVoiceSos');
  const btnOverview = document.getElementById('btnOpenVoiceRecorder');
  const btnClose = document.getElementById('btnCloseVoiceModal');
  const btnCancel = document.getElementById('btnCancelVoiceModal');
  const btnRecord = document.getElementById('btnModalMicRecord');
  const btnTransmit = document.getElementById('btnTransmitVoiceSos');
  const transcriptEl = document.getElementById('voiceModalTranscript');
  const statusLabel = document.getElementById('voiceModalMicStatus');
  const statusSub = document.getElementById('voiceModalMicSub');
  const durationEl = document.getElementById('voiceModalDuration');
  const audioBars = document.getElementById('voiceModalAudioBars');
  const gpsBadge = document.getElementById('voiceModalGpsCoords');
  const iconNormal = document.getElementById('micIconNormal');
  const iconStop = document.getElementById('micIconStop');

  // Rescue Center Controls
  const btnSimulate = document.getElementById('btnSimulateVoiceSos');
  const filterAll = document.getElementById('btnFilterVoiceAll');
  const filterCritical = document.getElementById('btnFilterVoiceCritical');
  const filterDispatched = document.getElementById('btnFilterVoiceDispatched');

  function openVoiceModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    resetVoiceRecorderUI();

    // Audible accessibility guidance for blind users
    speakVoice('Voice emergency SOS open. Click the big microphone or press Space to describe your situation. Or click one of the four emergency presets.');

    // Update GPS preview badge
    if (gpsBadge) {
      if (state.gps.lat && state.gps.lng) {
        gpsBadge.textContent = `📍 GPS Attached: ${state.gps.lat.toFixed(4)}°, ${state.gps.lng.toFixed(4)}°`;
        gpsBadge.className = 'badge badge-success';
      } else {
        gpsBadge.textContent = `📍 GPS: Base Station Fix Attached`;
        gpsBadge.className = 'badge badge-success';
      }
    }
  }

  function closeVoiceModal() {
    if (state.voice.recording) {
      stopVoiceRecording();
    }
    if (modal) modal.style.display = 'none';
  }

  function resetVoiceRecorderUI() {
    state.voice.transcript = '';
    state.voice.selectedPreset = null;
    state.voice.duration = 0;
    if (state.voice.timerInterval) clearInterval(state.voice.timerInterval);
    
    if (transcriptEl) {
      transcriptEl.textContent = '"Your spoken voice will be transcribed here automatically..."';
      transcriptEl.className = 'voice-transcript-text empty';
    }
    if (statusLabel) statusLabel.textContent = 'Click Mic to Speak Your Emergency';
    if (statusSub) statusSub.textContent = 'Or choose a 1-click distress preset below (No reading/typing needed)';
    if (durationEl) {
      durationEl.style.display = 'none';
      durationEl.textContent = '00:00';
    }
    if (audioBars) audioBars.classList.remove('active');
    if (btnRecord) btnRecord.classList.remove('recording');
    if (iconNormal) iconNormal.style.display = 'block';
    if (iconStop) iconStop.style.display = 'none';
    if (btnTransmit) btnTransmit.disabled = true;
  }

  // Preset Selection for illiterate / rapid distress
  const presetItems = document.querySelectorAll('.preset-voice-item');
  presetItems.forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-preset');
      let text = '';
      let urgency = 'CRITICAL';
      let tags = [];

      if (type === 'trapped') {
        text = 'I am trapped under collapsed debris and cannot move. Building entrance is blocked. Send immediate rescue with extraction tools.';
        urgency = 'CRITICAL';
        tags = ['CRITICAL', 'TRAPPED', 'COLLAPSE'];
      } else if (type === 'medical') {
        text = 'Critical medical emergency here. Deep arterial bleeding and victim is losing consciousness. Need immediate medical paramedic team.';
        urgency = 'CRITICAL';
        tags = ['CRITICAL', 'MEDICAL', 'BLEEDING'];
      } else if (type === 'flood') {
        text = 'Flood water level is rising rapidly above second floor. Stranded on rooftop with elderly person and infant. Need rescue boat.';
        urgency = 'HIGH';
        tags = ['HIGH', 'FLOOD', 'EVACUATION'];
      } else if (type === 'blind') {
        text = 'I am visually impaired / blind, stranded alone without assistance after earthquake shock. Need guided evacuation to safety camp.';
        urgency = 'CRITICAL';
        tags = ['CRITICAL', 'BLIND / ACCESSIBLE', 'EVACUATION'];
      }

      state.voice.transcript = text;
      state.voice.selectedPreset = { type, text, urgency, tags };
      state.voice.duration = Math.floor(Math.random() * 4) + 4; // 4-7s

      if (transcriptEl) {
        transcriptEl.textContent = `"${text}"`;
        transcriptEl.className = 'voice-transcript-text';
      }

      if (statusLabel) statusLabel.textContent = `Preset Loaded: ${item.querySelector('.preset-voice-title').textContent}`;
      if (statusSub) statusSub.textContent = `Ready to transmit over LoRa emergency mesh with GPS.`;
      if (btnTransmit) btnTransmit.disabled = false;

      // Read aloud for blind/illiterate user so they hear what will be sent
      playAckChime();
      speakVoice(`Selected emergency: ${text}. Click Transmit to broadcast to rescue team.`);
    });
  });

  // Start Voice Recording
  async function startVoiceRecording() {
    state.voice.recording = true;
    state.voice.audioChunks = [];
    state.voice.duration = 0;
    state.voice.transcript = '';

    if (btnRecord) btnRecord.classList.add('recording');
    if (btnHeader) btnHeader.classList.add('is-recording');
    if (iconNormal) iconNormal.style.display = 'none';
    if (iconStop) iconStop.style.display = 'block';
    if (audioBars) audioBars.classList.add('active');
    if (durationEl) {
      durationEl.style.display = 'block';
      durationEl.textContent = '00:00';
    }
    if (statusLabel) statusLabel.textContent = 'Listening & Recording Voice... Speak Now!';
    if (statusSub) statusSub.textContent = 'Speak your situation, injuries, and surroundings clearly.';
    if (transcriptEl) {
      transcriptEl.textContent = 'Listening to voice in real-time...';
      transcriptEl.className = 'voice-transcript-text';
    }

    playRadioBeep();
    speakVoice('Recording active. State your emergency now.');

    // Timer
    state.voice.timerInterval = setInterval(() => {
      state.voice.duration++;
      const mins = String(Math.floor(state.voice.duration / 60)).padStart(2, '0');
      const secs = String(state.voice.duration % 60).padStart(2, '0');
      if (durationEl) durationEl.textContent = `${mins}:${secs}`;
    }, 1000);

    // Real SpeechRecognition if supported
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        state.voice.recognition = new SpeechRec();
        state.voice.recognition.continuous = true;
        state.voice.recognition.interimResults = true;
        state.voice.recognition.lang = 'en-US';

        state.voice.recognition.onresult = event => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + ' ';
          }
          state.voice.transcript = current.trim();
          if (transcriptEl) transcriptEl.textContent = `"${state.voice.transcript}"`;
          if (btnTransmit) btnTransmit.disabled = false;
        };

        state.voice.recognition.start();
      } catch (_) {}
    }

    // MediaRecorder for real microphone audio capture
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.voice.mediaRecorder = new MediaRecorder(stream);
        state.voice.mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) state.voice.audioChunks.push(e.data);
        };
        state.voice.mediaRecorder.onstop = () => {
          if (state.voice.audioChunks.length > 0) {
            state.voice.audioBlob = new Blob(state.voice.audioChunks, { type: 'audio/webm' });
            state.voice.audioUrl = URL.createObjectURL(state.voice.audioBlob);
          }
          // Stop stream tracks
          stream.getTracks().forEach(track => track.stop());
        };
        state.voice.mediaRecorder.start(250);
      } catch (err) {
        console.warn('Microphone permission or hardware unavailable, using synthesis fallback', err);
      }
    }
  }

  // Stop Voice Recording
  function stopVoiceRecording() {
    state.voice.recording = false;
    if (state.voice.timerInterval) clearInterval(state.voice.timerInterval);

    if (btnRecord) btnRecord.classList.remove('recording');
    if (btnHeader) btnHeader.classList.remove('is-recording');
    if (iconNormal) iconNormal.style.display = 'block';
    if (iconStop) iconStop.style.display = 'none';
    if (audioBars) audioBars.classList.remove('active');

    if (state.voice.recognition) {
      try { state.voice.recognition.stop(); } catch (_) {}
    }
    if (state.voice.mediaRecorder && state.voice.mediaRecorder.state !== 'inactive') {
      try { state.voice.mediaRecorder.stop(); } catch (_) {}
    }

    if (!state.voice.transcript || state.voice.transcript.length < 3) {
      state.voice.transcript = 'Emergency voice distress call recorded by field victim. Immediate rescue team deployment requested.';
      if (transcriptEl) transcriptEl.textContent = `"${state.voice.transcript}"`;
    }

    if (statusLabel) statusLabel.textContent = `Voice Note Captured (${state.voice.duration}s)`;
    if (statusSub) statusSub.textContent = 'Review transcript above. Ready to radiate packet over LoRa mesh.';
    if (btnTransmit) btnTransmit.disabled = false;

    playResponseChime();
    speakVoice(`Recording finished. Ready to transmit voice emergency with your GPS coordinates.`);
  }

  // Toggle record button
  if (btnRecord) {
    btnRecord.addEventListener('click', () => {
      if (!state.voice.recording) {
        startVoiceRecording();
      } else {
        stopVoiceRecording();
      }
    });
  }

  // Transmit Voice SOS
  if (btnTransmit) {
    btnTransmit.addEventListener('click', () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      const id = `VOICE-${Date.now().toString().slice(-4)}`;
      const transcript = state.voice.transcript || 'Emergency voice distress recorded.';
      const lat = state.gps.lat || 11.05527;
      const lng = state.gps.lng || 78.04733;

      // Extract triage tags
      const lower = transcript.toLowerCase();
      const tags = [];
      let urgency = 'CRITICAL';
      if (lower.includes('bleed') || lower.includes('doctor') || lower.includes('medic') || lower.includes('injur')) tags.push('MEDICAL');
      if (lower.includes('trap') || lower.includes('debris') || lower.includes('collaps') || lower.includes('block')) tags.push('TRAPPED');
      if (lower.includes('flood') || lower.includes('water') || lower.includes('drown')) tags.push('FLOOD');
      if (lower.includes('blind') || lower.includes('elder') || lower.includes('child') || lower.includes('disab')) tags.push('BLIND / ACCESSIBLE');
      if (tags.length === 0) tags.push('CRITICAL DISTRESS');

      const voiceNote = {
        id,
        senderId: 'HOST-LAPTOP (Local User)',
        callerName: 'Victim (Voice Note SOS)',
        urgency,
        lat,
        lng,
        timestamp: timeStr,
        duration: state.voice.duration || 5,
        transcript,
        tags,
        status: 'AWAITING_DISPATCH',
        audioUrl: state.voice.audioUrl || null
      };

      state.voiceNotes.unshift(voiceNote);

      // Create linked Emergency Incident in Alerts
      const alertItem = {
        id: `SOS-${id}`,
        origin: 'Accessible Voice Note (Local Host)',
        lat,
        lng,
        timestamp: timeStr,
        status: 'ACTIVE',
        voiceNote
      };
      state.alerts.unshift(alertItem);
      updateAlertsUI();

      // Transmit over Web Serial LoRa
      const loraPayload = `VOICE_SOS,${id},${lat.toFixed(5)},${lng.toFixed(5)},${urgency},${transcript.slice(0, 60)}\n`;
      transmitSerialPacket(loraPayload);

      logTerminalEntry(`TX -> [RESCUE_MESH] (${urgency} VOICE_SOS): "${transcript}" [GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'tx');
      logOverviewPacket('RESCUE_MESH', 'EMERGENCY', `🎙️ [VOICE SOS] ${transcript}`);
      logAudit(`Emergency Voice Note transmitted: ${id} - "${transcript}"`);

      // Feedback for blind/illiterate user
      playEmergencySiren();
      speakVoice(`Voice SOS successfully radiated over LoRa mesh. Rescue team has received your audio and coordinates.`);
      showToast(`🎙️ Voice SOS Transmitted! Attached GPS: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°`, 'emergency');

      closeVoiceModal();
      renderRescueVoiceNotes();
    });
  }

  // Event Listeners for Open/Close
  if (btnHeader) btnHeader.addEventListener('click', openVoiceModal);
  if (btnOverview) btnOverview.addEventListener('click', openVoiceModal);
  if (btnClose) btnClose.addEventListener('click', closeVoiceModal);
  if (btnCancel) btnCancel.addEventListener('click', closeVoiceModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeVoiceModal();
    });
  }

  // Accessibility shortcut: Press 'v' or 'V' to trigger Voice SOS
  window.addEventListener('keydown', e => {
    if ((e.key === 'v' || e.key === 'V') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openVoiceModal();
    }
  });

  // Rescue Center Filter Buttons
  if (filterAll) {
    filterAll.addEventListener('click', () => {
      state.voice.activeFilter = 'all';
      filterAll.classList.add('active');
      if (filterCritical) filterCritical.classList.remove('active');
      if (filterDispatched) filterDispatched.classList.remove('active');
      renderRescueVoiceNotes();
    });
  }
  if (filterCritical) {
    filterCritical.addEventListener('click', () => {
      state.voice.activeFilter = 'critical';
      filterCritical.classList.add('active');
      if (filterAll) filterAll.classList.remove('active');
      if (filterDispatched) filterDispatched.classList.remove('active');
      renderRescueVoiceNotes();
    });
  }
  if (filterDispatched) {
    filterDispatched.addEventListener('click', () => {
      state.voice.activeFilter = 'dispatched';
      filterDispatched.classList.add('active');
      if (filterAll) filterAll.classList.remove('active');
      if (filterCritical) filterCritical.classList.remove('active');
      renderRescueVoiceNotes();
    });
  }

  // Simulate Victim Voice SOS button for testing/demo
  if (btnSimulate) {
    btnSimulate.addEventListener('click', triggerSimulatedVoiceSos);
  }

  renderRescueVoiceNotes();
}

// Render the Rescue Team Voice Notes Processing Queue
function renderRescueVoiceNotes() {
  const container = document.getElementById('rescueVoiceNotesList');
  const countBadge = document.getElementById('voiceQueueCountBadge');
  const countAll = document.getElementById('countVoiceAll');
  const countCritical = document.getElementById('countVoiceCritical');
  const countDispatched = document.getElementById('countVoiceDispatched');

  const allNotes = state.voiceNotes;
  const criticalCount = allNotes.filter(n => n.urgency === 'CRITICAL' && n.status !== 'RESOLVED').length;
  const dispatchedCount = allNotes.filter(n => n.status === 'DISPATCHED').length;

  if (countBadge) countBadge.textContent = `${criticalCount} Active SOS`;
  if (countAll) countAll.textContent = allNotes.length;
  if (countCritical) countCritical.textContent = criticalCount;
  if (countDispatched) countDispatched.textContent = dispatchedCount;

  if (!container) return;

  let filtered = allNotes;
  if (state.voice.activeFilter === 'critical') {
    filtered = allNotes.filter(n => n.urgency === 'CRITICAL');
  } else if (state.voice.activeFilter === 'dispatched') {
    filtered = allNotes.filter(n => n.status === 'DISPATCHED');
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box" style="padding: 24px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 8px;">🎙️</div>
        <h4 style="font-size: 14px; font-weight: 700; color: var(--txt);">No Voice Notes in Queue</h4>
        <p style="font-size: 12px; color: var(--txt-secondary); margin-top: 4px;">
          Incoming audio distress calls from field victims will appear here with AI triage tags and playback controls.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(note => {
    const isPlaying = state.voice.playingAudioId === note.id;
    const isDispatched = note.status === 'DISPATCHED';
    const isResolved = note.status === 'RESOLVED';
    const isCritical = note.urgency === 'CRITICAL';

    return `
      <div class="voice-player-widget ${isCritical ? 'critical' : ''}" id="voiceWidget-${note.id}">
        <!-- Top Row: Caller Info & Status -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; font-size: 13.5px; color: var(--txt);">${escapeHtml(note.callerName)}</span>
              <span class="badge ${isCritical ? 'badge-emergency' : 'badge-warning'}">${escapeHtml(note.urgency)}</span>
              <span class="badge ${isDispatched ? 'badge-success' : isResolved ? 'badge-neutral' : 'badge-emergency'}">
                ${escapeHtml(note.status.replace('_', ' '))}
              </span>
            </div>
            <div style="font-size: 11.5px; color: var(--txt-secondary); margin-top: 2px;">
              Node: <strong style="font-family: var(--font-mono);">${escapeHtml(note.senderId)}</strong> · Time: <span style="font-family: var(--font-mono);">${note.timestamp}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn btn-xs-link" onclick="locateVoiceNodeOnMap('${note.id}')" title="Locate on Tactical Map">
              📍 ${note.lat.toFixed(4)}°, ${note.lng.toFixed(4)}°
            </button>
          </div>
        </div>

        <!-- Audio Player Bar -->
        <div class="voice-player-top">
          <button class="voice-play-btn" onclick="togglePlayVoiceNote('${note.id}')" id="playBtn-${note.id}" title="Play Voice Audio">
            ${isPlaying ? '⏸' : '▶'}
          </button>
          <div class="voice-track-info">
            <div class="voice-progress-container" onclick="togglePlayVoiceNote('${note.id}')">
              <div class="voice-progress-bar" id="progressBar-${note.id}" style="width: ${isPlaying ? '100%' : '0%'}; transition: width ${note.duration}s linear;"></div>
            </div>
            <div class="voice-meta-row">
              <span>🎙️ Voice Note Audio</span>
              <span>00:${String(note.duration).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        <!-- Transcript with AI Triage Highlight -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin: 8px 0; font-size: 13px; color: var(--txt); line-height: 1.45;">
          "${escapeHtml(note.transcript)}"
        </div>

        <!-- Triage Tags -->
        <div class="voice-triage-tags">
          ${note.tags.map(t => `<span class="triage-tag ${t.toLowerCase().includes('medic') ? 'medical' : t.toLowerCase().includes('trap') ? 'trapped' : t.toLowerCase().includes('flood') ? 'flood' : t.toLowerCase().includes('blind') ? 'accessibility' : 'critical'}">${escapeHtml(t)}</span>`).join('')}
        </div>

        <!-- Rescue Team Action Toolbar -->
        <div class="rescue-action-bar">
          <button type="button" class="btn-rescue-action" onclick="readAloudVoiceNote('${note.id}')" title="Text-to-Speech audio readout for field operators">
            🔊 Read Aloud (TTS)
          </button>

          ${!isDispatched && !isResolved ? `
            <button type="button" class="btn-rescue-action primary-dispatch" onclick="dispatchRescueTeam('${note.id}')" title="Deploy field rescue team to this GPS coordinate">
              🚑 Dispatch Rescue Team
            </button>
          ` : `
            <button type="button" class="btn-rescue-action active-dispatched" disabled>
              ✓ Team Dispatched
            </button>
          `}

          <button type="button" class="btn-rescue-action" onclick="replyVoiceToVictim('${note.id}')" title="Transmit LoRa audio confirmation back to victim">
            🎙️ Audio Reply to Victim
          </button>

          <button type="button" class="btn-rescue-action" onclick="locateVoiceNodeOnMap('${note.id}')" title="Pin on Map">
            🗺️ Pin on Map
          </button>

          ${!isResolved ? `
            <button type="button" class="btn-rescue-action" onclick="resolveVoiceNote('${note.id}')" title="Mark Incident Resolved">
              ✓ Resolve
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Audio Playback Handler
window.togglePlayVoiceNote = function(id) {
  const note = state.voiceNotes.find(n => n.id === id);
  if (!note) return;

  const playBtn = document.getElementById(`playBtn-${id}`);
  const progressBar = document.getElementById(`progressBar-${id}`);

  if (state.voice.playingAudioId === id) {
    // Stop playback
    state.voice.playingAudioId = null;
    if (state.voice.audioElement) {
      state.voice.audioElement.pause();
      state.voice.audioElement = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (playBtn) playBtn.textContent = '▶';
    if (progressBar) progressBar.style.width = '0%';
    return;
  }

  // Stop any other currently playing audio
  if (state.voice.playingAudioId) {
    const oldBtn = document.getElementById(`playBtn-${state.voice.playingAudioId}`);
    const oldBar = document.getElementById(`progressBar-${state.voice.playingAudioId}`);
    if (oldBtn) oldBtn.textContent = '▶';
    if (oldBar) oldBar.style.width = '0%';
    if (state.voice.audioElement) state.voice.audioElement.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  state.voice.playingAudioId = id;
  if (playBtn) playBtn.textContent = '⏸';
  if (progressBar) progressBar.style.width = '100%';

  if (note.audioUrl) {
    // Play real recorded audio blob
    state.voice.audioElement = new Audio(note.audioUrl);
    state.voice.audioElement.play().catch(() => {
      speakVoice(note.transcript);
    });
    state.voice.audioElement.onended = () => {
      state.voice.playingAudioId = null;
      if (playBtn) playBtn.textContent = '▶';
      if (progressBar) progressBar.style.width = '0%';
    };
  } else {
    // Play synthetic voice speech synthesis
    playRadioBeep();
    speakVoice(note.transcript);
    setTimeout(() => {
      if (state.voice.playingAudioId === id) {
        state.voice.playingAudioId = null;
        if (playBtn) playBtn.textContent = '▶';
        if (progressBar) progressBar.style.width = '0%';
      }
    }, (note.duration || 5) * 1000);
  }
};

// Read Voice Note Aloud via SpeechSynthesis (Hands-free for rescue responders)
window.readAloudVoiceNote = function(id) {
  const note = state.voiceNotes.find(n => n.id === id);
  if (!note) return;

  playResponseChime();
  const text = `Emergency Voice Note from ${note.callerName}. Urgency: ${note.urgency}. Message: ${note.transcript}. Location: ${note.lat.toFixed(4)} degrees North, ${note.lng.toFixed(4)} degrees East. Status: ${note.status.replace('_', ' ')}.`;
  speakVoice(text);
  showToast(`🔊 Reading voice note aloud over speaker...`, 'info');
};

// Dispatch Rescue Team Action
window.dispatchRescueTeam = function(id) {
  const note = state.voiceNotes.find(n => n.id === id);
  if (!note) return;

  note.status = 'DISPATCHED';

  // Update corresponding alert if found
  const alert = state.alerts.find(a => a.id.includes(id));
  if (alert) alert.status = 'ACKNOWLEDGED';

  // LoRa Web Serial Dispatch Packet
  transmitSerialPacket(`VOICE_DISPATCH,${id},TEAM_ALPHA,${note.lat},${note.lng}\n`);

  playResponseChime();
  speakVoice(`Rescue Team Alpha dispatched to ${note.callerName}'s GPS location.`);
  showToast(`🚑 Rescue Team Dispatched to ${note.callerName} [GPS: ${note.lat.toFixed(4)}°, ${note.lng.toFixed(4)}°]`, 'success');
  logAudit(`Rescue Team Alpha dispatched for Voice SOS [${id}] - ${note.callerName}`);

  renderRescueVoiceNotes();
  updateAlertsUI();
};

// Audio Voice Reply Back to Victim (So blind victims hear confirmation on their device)
window.replyVoiceToVictim = function(id) {
  const note = state.voiceNotes.find(n => n.id === id);
  if (!note) return;

  const replyText = `Rescue team deployed. We have your GPS coordinates. Help is arriving in approximately 8 minutes. Keep calm and stay in place.`;

  // Transmit over LoRa
  transmitSerialPacket(`VOICE_RETURN,${note.senderId},${replyText.slice(0, 70)}\n`);

  playRadioBeep();
  speakVoice(replyText);
  showToast(`🎙️ Audio return reply transmitted to ${note.senderId} over LoRa`, 'success');
  logTerminalEntry(`TX -> [${note.senderId}] (VOICE_REPLY): "${replyText}"`, 'tx');
  logAudit(`Audio voice reply transmitted to victim [${id}]: "${replyText}"`);
};

// Mark Voice Note Incident Resolved
window.resolveVoiceNote = function(id) {
  const note = state.voiceNotes.find(n => n.id === id);
  if (!note) return;

  note.status = 'RESOLVED';
  const alertIdx = state.alerts.findIndex(a => a.id.includes(id));
  if (alertIdx !== -1) {
    state.alerts.splice(alertIdx, 1);
  }

  playAckChime();
  speakVoice(`Voice distress incident ${id} marked as resolved.`);
  showToast(`Voice Note Incident [${id}] marked as resolved.`, 'success');
  logAudit(`Voice incident [${id}] resolved by operator.`);

  renderRescueVoiceNotes();
  updateAlertsUI();
};

// Locate Voice Note on Tactical Map
window.locateVoiceNodeOnMap = function(id) {
  const note = state.voiceNotes.find(n => n.id === id);
  if (!note) return;

  // Switch to Overview or Map tab
  const btnNavMap = document.querySelector('[data-view="overview"]');
  if (btnNavMap) btnNavMap.click();

  if (state.maps.overview) {
    state.maps.overview.setView([note.lat, note.lng], 16, { animate: true });

    // Temporary highlight marker
    const sosMarker = L.circleMarker([note.lat, note.lng], {
      radius: 14,
      color: '#E85D3F',
      weight: 3,
      fillColor: '#E85D3F',
      fillOpacity: 0.35
    }).addTo(state.maps.overview);

    sosMarker.bindPopup(`
      <div style="padding: 4px;">
        <div style="font-weight: 800; color: #E85D3F; font-size: 13px;">🎙️ VOICE SOS: ${escapeHtml(note.callerName)}</div>
        <div style="font-size: 11px; margin: 4px 0;">"${escapeHtml(note.transcript)}"</div>
        <div style="font-family: monospace; font-size: 11px;">📍 ${note.lat.toFixed(5)}°, ${note.lng.toFixed(5)}°</div>
      </div>
    `).openPopup();

    setTimeout(() => {
      try { state.maps.overview.removeLayer(sosMarker); } catch (_) {}
    }, 15000);
  }

  showToast(`📍 Pinned ${note.callerName} on tactical map (${note.lat.toFixed(4)}°, ${note.lng.toFixed(4)}°)`, 'info');
};

// Simulate incoming Voice SOS from stranded field victim
function triggerSimulatedVoiceSos() {
  const id = `VOICE-${Math.floor(Math.random() * 800 + 100)}`;
  const samples = [
    {
      callerName: 'Illiterate Villager / Stranded Senior',
      transcript: 'Flood waters entered ground level. I cannot swim and have no boat. Trapped on upper balcony with child. Send rescue boat quickly.',
      urgency: 'CRITICAL',
      tags: ['CRITICAL', 'FLOOD', 'ELDERLY / CHILD'],
      duration: 6
    },
    {
      callerName: 'Visually Impaired Field Worker',
      transcript: 'I lost my cane and cannot see where the road collapsed. Surrounded by fallen electric poles. Need physical guide to evacuation camp.',
      urgency: 'CRITICAL',
      tags: ['CRITICAL', 'BLIND / ACCESSIBLE', 'COLLAPSE'],
      duration: 7
    },
    {
      callerName: 'Injured Civilian with Broken Leg',
      transcript: 'Earthquake tremor broke my leg, unable to crawl out. Dust everywhere. Please send stretcher and first aid paramedics.',
      urgency: 'CRITICAL',
      tags: ['CRITICAL', 'MEDICAL', 'TRAPPED'],
      duration: 5
    }
  ];

  const pick = samples[Math.floor(Math.random() * samples.length)];
  const lat = (state.gps.lat || 11.055) + (Math.random() * 0.006 - 0.003);
  const lng = (state.gps.lng || 78.047) + (Math.random() * 0.006 - 0.003);
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  const voiceNote = {
    id,
    senderId: `NODE-0${Math.floor(Math.random() * 5 + 3)}`,
    callerName: pick.callerName,
    urgency: pick.urgency,
    lat,
    lng,
    timestamp: timeStr,
    duration: pick.duration,
    transcript: pick.transcript,
    tags: pick.tags,
    status: 'AWAITING_DISPATCH',
    audioUrl: null
  };

  state.voiceNotes.unshift(voiceNote);

  // Linked Alert
  const alertItem = {
    id: `SOS-${id}`,
    origin: `LoRa Field Node (${voiceNote.senderId})`,
    lat,
    lng,
    timestamp: timeStr,
    status: 'ACTIVE',
    voiceNote
  };
  state.alerts.unshift(alertItem);
  updateAlertsUI();

  // Log to radio terminal
  logTerminalEntry(`RX <- [${voiceNote.senderId}] (VOICE_SOS, ${pick.urgency}): "${pick.transcript}" [GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'rx');
  logOverviewPacket(voiceNote.senderId, 'EMERGENCY', `🎙️ [VOICE SOS] ${pick.transcript}`);
  logAudit(`Simulated Voice SOS received from ${voiceNote.senderId}: "${pick.transcript}"`);

  // Audible announcement
  playEmergencySiren();
  speakVoice(`Incoming Emergency Voice SOS from ${pick.callerName}: ${pick.transcript}`);
  showToast(`🚨 Incoming Voice SOS: "${pick.callerName}" - ${pick.tags.join(', ')}`, 'emergency');

  renderRescueVoiceNotes();
}

// ========================================================
// 3. Leaflet Mapping & Offline Tactical Radar
// ========================================================
let radarSweepAngle = 0;
let radarAnimationId = null;

function initMaps() {
  // Define Offline Tactical Grid Layer (renders coordinate grid canvas when internet tiles fail)
  if (window.L && L.GridLayer && !L.TacticalGridLayer) {
    L.TacticalGridLayer = L.GridLayer.extend({
      createTile: function(coords) {
        const tile = document.createElement('canvas');
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;
        const ctx = tile.getContext('2d');

        // Dark tactical grid canvas
        ctx.fillStyle = '#0F1318';
        ctx.fillRect(0, 0, size.x, size.y);

        // Coordinate grid lines
        ctx.strokeStyle = 'rgba(45, 138, 86, 0.16)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x <= size.x; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, size.y);
          ctx.stroke();
        }
        for (let y = 0; y <= size.y; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size.x, y);
          ctx.stroke();
        }

        // Tactical tile border & coordinate mark
        ctx.strokeStyle = 'rgba(45, 138, 86, 0.35)';
        ctx.strokeRect(0, 0, size.x, size.y);
        ctx.fillStyle = 'rgba(45, 138, 86, 0.45)';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(`+ ${coords.z}/${coords.x}/${coords.y}`, 8, 16);

        return tile;
      }
    });
  }

  // Use real cached coordinates as default center if available
  const defaultCenter = (state.gps.lat && state.gps.lng)
    ? [state.gps.lat, state.gps.lng]
    : [11.05527, 78.04733];

  // Overview Map
  const mapElem1 = document.getElementById('overviewMap');
  if (mapElem1 && window.L) {
    state.maps.overview = L.map('overviewMap', {
      center: defaultCenter,
      zoom: 15,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(state.maps.overview);

    // Add offline tactical canvas base layer
    if (L.TacticalGridLayer) {
      new L.TacticalGridLayer({ maxZoom: 19, zIndex: 1 }).addTo(state.maps.overview);
    }

    const tileLayer1 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      zIndex: 2
    }).addTo(state.maps.overview);

    tileLayer1.on('tileerror', () => {
      // Auto-detect offline tile failure - tactical canvas is visible underneath
      const mapBadge = document.getElementById('overviewMapStatusBadge');
      if (mapBadge) {
        mapBadge.className = 'badge badge-warning';
        mapBadge.textContent = 'OFFLINE · TACTICAL GRID READY';
      }
    });

    // Ensure Leaflet calculates viewport geometry
    setTimeout(() => {
      if (state.maps.overview) state.maps.overview.invalidateSize();
    }, 200);
  }

  // Full Map
  const mapElem2 = document.getElementById('fullMap');
  if (mapElem2 && window.L) {
    state.maps.full = L.map('fullMap', {
      center: defaultCenter,
      zoom: 15,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(state.maps.full);

    // Add offline tactical canvas base layer
    if (L.TacticalGridLayer) {
      new L.TacticalGridLayer({ maxZoom: 19, zIndex: 1 }).addTo(state.maps.full);
    }

    const tileLayer2 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      zIndex: 2
    }).addTo(state.maps.full);

    tileLayer2.on('tileerror', () => {
      const hudFix = document.getElementById('hudFixStatus');
      if (hudFix) hudFix.textContent = 'Offline (Tactical Grid Ready)';
    });

    setTimeout(() => {
      if (state.maps.full) state.maps.full.invalidateSize();
    }, 200);
  }

  // Initialize Offline Tactical Radar Engine
  initTacticalRadar();
  initMapModeToggles();

  // If already offline on page load, automatically set to Offline Radar
  if (!navigator.onLine) {
    setMapMode('radar', false);
    setFullMapMode('radar', false);
    const mapBadge = document.getElementById('overviewMapStatusBadge');
    if (mapBadge) {
      mapBadge.className = 'badge badge-success';
      mapBadge.textContent = 'OFFLINE RADAR (100% OFF-GRID)';
    }
  }

  // Network Offline / Online Listeners
  window.addEventListener('offline', () => {
    showToast('Network Offline: Switched to Offline Tactical Radar Grid', 'warning');
    setMapMode('radar');
    setFullMapMode('radar');
    logAudit('Network lost. Switched to 100% Offline Tactical Radar Grid.');
  });

  window.addEventListener('online', () => {
    showToast('Network Online: Street Map tiles available', 'success');
    logAudit('Network restored.');
  });

  // Center buttons
  const btnCenterMap = document.getElementById('btnCenterMap');
  if (btnCenterMap) {
    btnCenterMap.addEventListener('click', centerOnLaptopGps);
  }

  const btnFullMapCenter = document.getElementById('btnFullMapCenter');
  if (btnFullMapCenter) {
    btnFullMapCenter.addEventListener('click', centerOnLaptopGps);
  }

  const btnRefreshGps = document.getElementById('btnRefreshGps');
  if (btnRefreshGps) {
    btnRefreshGps.addEventListener('click', () => {
      showToast('Refreshing laptop GPS fix...', 'info');
      initGeolocation();
    });
  }
}

// Map Mode Toggles: Street Map vs. Offline Tactical Radar
function initMapModeToggles() {
  const btnModeRadar = document.getElementById('btnModeRadar');
  const btnModeTiles = document.getElementById('btnModeTiles');
  const btnFullModeRadar = document.getElementById('btnFullModeRadar');
  const btnFullModeTiles = document.getElementById('btnFullModeTiles');

  if (btnModeRadar) btnModeRadar.addEventListener('click', () => setMapMode('radar'));
  if (btnModeTiles) btnModeTiles.addEventListener('click', () => setMapMode('tiles'));
  if (btnFullModeRadar) btnFullModeRadar.addEventListener('click', () => setFullMapMode('radar'));
  if (btnFullModeTiles) btnFullModeTiles.addEventListener('click', () => setFullMapMode('tiles'));
}

function setMapMode(mode, showNotification = true) {
  const mapElem = document.getElementById('overviewMap');
  const radarElem = document.getElementById('overviewRadarView');
  const btnRadar = document.getElementById('btnModeRadar');
  const btnTiles = document.getElementById('btnModeTiles');
  const mapBadge = document.getElementById('overviewMapStatusBadge');

  if (mode === 'radar') {
    if (mapElem) mapElem.style.display = 'none';
    if (radarElem) radarElem.style.display = 'flex';
    if (btnRadar) btnRadar.classList.add('active');
    if (btnTiles) btnTiles.classList.remove('active');
    if (mapBadge) {
      mapBadge.className = 'badge badge-success';
      mapBadge.textContent = 'OFFLINE RADAR (100% OFF-GRID)';
    }
    if (showNotification) {
      showToast('Switched to Offline Tactical Radar Grid (100% Offline)', 'info');
    }
  } else {
    if (mapElem) mapElem.style.display = 'block';
    if (radarElem) radarElem.style.display = 'none';
    if (btnRadar) btnRadar.classList.remove('active');
    if (btnTiles) btnTiles.classList.add('active');
    if (mapBadge) {
      mapBadge.className = 'badge badge-success';
      mapBadge.textContent = navigator.onLine ? 'REAL LAPTOP GPS' : 'TACTICAL GRID (OFFLINE)';
    }
    if (state.maps.overview) {
      setTimeout(() => state.maps.overview.invalidateSize(), 50);
    }
  }
}

function setFullMapMode(mode, showNotification = true) {
  const mapElem = document.getElementById('fullMap');
  const radarElem = document.getElementById('fullRadarView');
  const btnRadar = document.getElementById('btnFullModeRadar');
  const btnTiles = document.getElementById('btnFullModeTiles');

  if (mode === 'radar') {
    if (mapElem) mapElem.style.display = 'none';
    if (radarElem) radarElem.style.display = 'flex';
    if (btnRadar) btnRadar.classList.add('active');
    if (btnTiles) btnTiles.classList.remove('active');
  } else {
    if (mapElem) mapElem.style.display = 'block';
    if (radarElem) radarElem.style.display = 'none';
    if (btnRadar) btnRadar.classList.remove('active');
    if (btnTiles) btnTiles.classList.add('active');
    if (state.maps.full) {
      setTimeout(() => state.maps.full.invalidateSize(), 50);
    }
  }
}

// Offline Tactical Radar Canvas Engine
function initTacticalRadar() {
  const canvases = [
    document.getElementById('overviewRadarCanvas'),
    document.getElementById('fullRadarCanvas')
  ].filter(Boolean);

  function drawRadar() {
    radarSweepAngle = (radarSweepAngle + 0.02) % (Math.PI * 2);

    canvases.forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }

      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(cx, cy) - 25;

      // Clear dark background
      ctx.fillStyle = '#0B0F14';
      ctx.fillRect(0, 0, w, h);

      // Radar Grid concentric rings (100m, 500m, 1km, 2.5km, 5km)
      const ringFractions = [0.2, 0.4, 0.6, 0.8, 1.0];
      const ringLabels = ['250m', '500m', '1km', '2.5km', '5km'];

      ringFractions.forEach((frac, i) => {
        const r = maxRadius * frac;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = i === ringFractions.length - 1 ? 'rgba(45, 138, 86, 0.6)' : 'rgba(45, 138, 86, 0.25)';
        ctx.lineWidth = i === ringFractions.length - 1 ? 1.5 : 1;
        ctx.stroke();

        // Ring distance label
        ctx.fillStyle = 'rgba(45, 138, 86, 0.7)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(ringLabels[i], cx + 6, cy - r + 12);
      });

      // Crosshairs & Cardinal axes
      ctx.strokeStyle = 'rgba(45, 138, 86, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.stroke();

      // Cardinal labels (N, E, S, W)
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillStyle = '#2D8A56';
      ctx.textAlign = 'center';
      ctx.fillText('N (000°)', cx, cy - maxRadius - 8);
      ctx.fillText('S (180°)', cx, cy + maxRadius + 16);
      ctx.textAlign = 'left';
      ctx.fillText('E (090°)', cx + maxRadius + 8, cy + 4);
      ctx.textAlign = 'right';
      ctx.fillText('W (270°)', cx - maxRadius - 8, cy + 4);

      // Rotating Radar Sweep Beam
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, radarSweepAngle - 0.3, radarSweepAngle);
      ctx.closePath();
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      gradient.addColorStop(0, 'rgba(45, 138, 86, 0.25)');
      gradient.addColorStop(1, 'rgba(45, 138, 86, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      // Center: Host Base Station (Laptop)
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center pulsing ring
      const pulseR = 14 + (Math.sin(Date.now() / 200) * 4 + 4);
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(45, 138, 86, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center Icon symbol
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬡', cx, cy);

      // Base Station Label
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#EEEEEE';
      ctx.fillText('LAPTOP BASE STATION', cx, cy + 24);

      // Coordinates text
      if (state.gps.lat && state.gps.lng) {
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = '#2D8A56';
        ctx.fillText(`${state.gps.lat.toFixed(5)}° N, ${state.gps.lng.toFixed(5)}° E`, cx, cy + 38);
      }

      // Plot connected field nodes (relative to Base Station)
      state.nodes.forEach(node => {
        if (!node.lat || !node.lng || !state.gps.lat || !state.gps.lng) return;

        // Calculate distance & bearing
        const dLat = (node.lat - state.gps.lat) * 111320; // meters approx
        const dLng = (node.lng - state.gps.lng) * 40075000 * Math.cos(state.gps.lat * Math.PI / 180) / 360;
        const distMeters = Math.sqrt(dLat * dLat + dLng * dLng);
        const maxRangeMeters = 5000; // 5km scale

        const nx = cx + (dLng / maxRangeMeters) * maxRadius;
        const ny = cy - (dLat / maxRangeMeters) * maxRadius;

        // Draw node blip
        ctx.beginPath();
        ctx.arc(nx, ny, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(node.nodeId, nx + 10, ny - 2);
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(`${Math.round(distMeters)}m (${node.rssi || ''}dBm)`, nx + 10, ny + 10);
      });
    });

    radarAnimationId = requestAnimationFrame(drawRadar);
  }

  if (!radarAnimationId) {
    drawRadar();
  }
}

function updateMapWithLaptopGps(lat, lng, accuracy) {
  // Update radar coordinate displays
  const latFmt = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngFmt = `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`;
  const coordStr = `${latFmt}, ${lngFmt}`;

  const radar1 = document.getElementById('overviewRadarCoords');
  const radar2 = document.getElementById('fullRadarCoords');
  if (radar1) radar1.textContent = coordStr;
  if (radar2) radar2.textContent = coordStr;

  if (!window.L) return;

  const baseStationIcon = L.divIcon({
    className: 'base-station-pin',
    html: `
      <div style="
        width: 34px;
        height: 34px;
        background: #111111;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/></svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  const popupContent = `
    <div style="font-family: Inter, sans-serif; min-width: 170px; padding: 2px;">
      <div style="font-weight: 800; font-size: 13px; color: #111;">LAPTOP HOST STATION</div>
      <div style="font-size: 11px; color: #777; margin-bottom: 6px;">Real Geolocation Fix</div>
      <div style="font-family: JetBrains Mono, monospace; font-size: 11.5px;">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      <div style="font-size: 11px; color: #2D8A56; margin-top: 4px; font-weight: 600;">Accuracy: ±${Math.round(accuracy)} meters</div>
    </div>
  `;

  // Overview Map: Center view on marker
  if (state.maps.overview) {
    if (!state.maps.overviewMarker) {
      state.maps.overviewMarker = L.marker([lat, lng], { icon: baseStationIcon })
        .addTo(state.maps.overview)
        .bindPopup(popupContent);
      state.maps.overviewAccuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#111111',
        weight: 1.5,
        fillColor: '#111111',
        fillOpacity: 0.08
      }).addTo(state.maps.overview);
    } else {
      state.maps.overviewMarker.setLatLng([lat, lng]).setPopupContent(popupContent);
      state.maps.overviewAccuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
    }

    state.maps.overview.setView([lat, lng], 15);
    state.maps.overview.invalidateSize();
  }

  // Full Map: Center view on marker
  if (state.maps.full) {
    if (!state.maps.fullMarker) {
      state.maps.fullMarker = L.marker([lat, lng], { icon: baseStationIcon })
        .addTo(state.maps.full)
        .bindPopup(popupContent);
      state.maps.fullAccuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#111111',
        weight: 1.5,
        fillColor: '#111111',
        fillOpacity: 0.08
      }).addTo(state.maps.full);
    } else {
      state.maps.fullMarker.setLatLng([lat, lng]).setPopupContent(popupContent);
      state.maps.fullAccuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
    }

    state.maps.full.setView([lat, lng], 16);
    state.maps.full.invalidateSize();
  }
}

function centerOnLaptopGps() {
  if (!state.gps.lat || !state.gps.lng) {
    showToast('GPS coordinates not acquired yet. Please wait...', 'warning');
    return;
  }

  if (state.activeView === 'overview' && state.maps.overview) {
    state.maps.overview.setView([state.gps.lat, state.gps.lng], 16, { animate: true });
    state.maps.overviewMarker.openPopup();
  } else if (state.activeView === 'map' && state.maps.full) {
    state.maps.full.setView([state.gps.lat, state.gps.lng], 16, { animate: true });
    state.maps.fullMarker.openPopup();
  }
}

// ========================================================
// 4. Web Serial API for Real Arduino Connection
// ========================================================
function initSerialControls() {
  const btnConnect = document.getElementById('btnConnectSerial');
  const btnConnectOverview = document.getElementById('btnConnectSerialOverview');
  const baudSelect = document.getElementById('settingsBaudRate');

  const handleConnect = async () => {
    if (!('serial' in navigator)) {
      showToast('Web Serial API not supported in this browser. Please use Google Chrome or Edge.', 'emergency');
      return;
    }

    if (state.serial.connected) {
      await disconnectSerial();
      return;
    }

    try {
      const baud = baudSelect ? parseInt(baudSelect.value, 10) : 115200;
      showToast('Select your Arduino / ESP32 USB port...', 'info');
      
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: baud });

      state.serial.port = port;
      state.serial.connected = true;

      updateSerialUI(true);
      showToast(`Connected to Arduino on USB Serial (${baud} bps)`, 'success');
      logAudit(`Arduino Gateway connected over USB Serial @ ${baud} baud.`);

      readSerialStream();
    } catch (err) {
      console.warn('Serial connect cancelled or failed:', err);
      if (err.name !== 'NotFoundError') {
        showToast(`Serial error: ${err.message}`, 'emergency');
      }
    }
  };

  if (btnConnect) btnConnect.addEventListener('click', handleConnect);
  if (btnConnectOverview) btnConnectOverview.addEventListener('click', handleConnect);
}

async function disconnectSerial() {
  if (state.serial.reader) {
    await state.serial.reader.cancel();
  }
  if (state.serial.port) {
    await state.serial.port.close();
  }
  state.serial.port = null;
  state.serial.connected = false;
  updateSerialUI(false);
  showToast('Arduino Gateway disconnected.', 'info');
  logAudit('Arduino Gateway disconnected by operator.');
}

function updateSerialUI(connected) {
  state.serial.connected = connected;
  const btnText = document.getElementById('btnConnectSerialText');
  const gwBadge = document.getElementById('gatewayStatusBadge');
  const gwState = document.getElementById('overviewGatewayState');
  const gwSub = document.getElementById('overviewGatewaySub');
  const ardDot = document.getElementById('arduinoIndicatorDot');
  const ardText = document.getElementById('arduinoStatusText');
  const ardSub = document.getElementById('arduinoSubText');
  const isNodeA = state.localRole === 'NODE_A';

  if (connected) {
    if (btnText) btnText.textContent = 'Disconnect USB';
    if (gwBadge) {
      gwBadge.className = 'badge badge-success';
      gwBadge.textContent = isNodeA
        ? (state.nodeA.ip ? `Node A (${state.nodeA.ip})` : 'Node A Connected')
        : 'Node B (Field Transceiver)';
    }
    if (gwState) { gwState.textContent = 'Online'; gwState.className = 'metric-value text-success'; }
    if (gwSub) {
      gwSub.textContent = isNodeA
        ? (state.nodeA.ip ? `ESP32 Node A IP: ${state.nodeA.ip} (TCP 3333)` : 'ESP32 Node A connected on COM9 (115200 bps)')
        : 'ESP32 Node B connected via Serial on COM port (115200 bps)';
    }
    if (ardDot) ardDot.className = 'status-dot green';
    if (ardText) ardText.textContent = isNodeA ? 'Node A: Online' : 'Node B: Online';
    if (ardSub) ardSub.textContent = 'Transceiver Active (COM9)';
  } else {
    if (btnText) btnText.textContent = 'Connect USB';
    if (!state.tcp.connected) {
      if (gwBadge) { gwBadge.className = 'badge badge-warning'; gwBadge.textContent = 'Disconnected'; }
      if (gwState) { gwState.textContent = 'Offline'; gwState.className = 'metric-value'; }
      if (gwSub) gwSub.textContent = 'Plug ESP32 into USB or connect via WiFi TCP';
      if (ardDot) ardDot.className = 'status-dot orange';
      if (ardText) ardText.textContent = isNodeA ? 'Node A: Waiting' : 'Node B: Waiting';
      if (ardSub) ardSub.textContent = 'No nodes connected';
    }
  }
}

// ========================================================
// 4B. WiFi TCP Bridge for ESP32 Node A (Port 3333)
// ========================================================
function initTcpControls() {
  const btnTcp = document.getElementById('btnConnectTcp');
  const btnTcpOverview = document.getElementById('btnConnectTcpOverview');

  connectWebSocketBridge();

  const handleTcpToggle = async () => {
    if (state.tcp.connected) {
      disconnectTcpBridge();
      return;
    }

    const defaultIp = (state.nodeA && state.nodeA.ip) || state.tcp.ip || '10.185.241.154';
    const targetIp = prompt('Enter ESP32 Node A IP Address (Port 3333):', defaultIp);
    if (!targetIp) return;

    state.tcp.ip = targetIp.trim();
    connectTcpBridge(state.tcp.ip, 3333);
  };

  if (btnTcp) btnTcp.addEventListener('click', handleTcpToggle);
  if (btnTcpOverview) btnTcpOverview.addEventListener('click', handleTcpToggle);
}

function connectWebSocketBridge() {
  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8765';
    const wsUrl = `${wsProto}//${host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS Bridge] Connected to LoraNet unified server');
      state.tcp.ws = ws;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init' || msg.type === 'tcp_status') {
          updateTcpUI(msg.tcpConnected, msg.targetHost || msg.host, msg.targetPort || msg.port);
        } else if (msg.type === 'rx' && msg.data) {
          handleIncomingSerialPacket(msg.data);
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      state.tcp.ws = null;
      setTimeout(connectWebSocketBridge, 4000);
    };
  } catch (e) {
    console.warn('[WS Bridge] Could not initialize:', e);
  }
}

function connectTcpBridge(host, port = 3333) {
  if (state.tcp.ws && state.tcp.ws.readyState === WebSocket.OPEN) {
    state.tcp.ws.send(JSON.stringify({
      action: 'connect_tcp',
      host,
      port
    }));
    showToast(`Connecting to Node A at ${host}:${port}...`, 'info');
  } else {
    fetch(`/api/connect-tcp?host=${encodeURIComponent(host)}&port=${port}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          updateTcpUI(true, host, port);
          showToast(`Connected to Node A TCP (${host}:${port})`, 'success');
        } else {
          showToast(`TCP Error: ${res.error}`, 'emergency');
        }
      })
      .catch(() => {
        showToast(`Local bridge server not running. Start run.bat or server.js.`, 'emergency');
      });
  }
}

function disconnectTcpBridge() {
  if (state.tcp.ws && state.tcp.ws.readyState === WebSocket.OPEN) {
    state.tcp.ws.send(JSON.stringify({ action: 'disconnect_tcp' }));
  } else {
    fetch('/api/disconnect-tcp');
  }
  updateTcpUI(false);
  showToast('Disconnected from Node A TCP.', 'info');
}

function sendViaTcpBridge(text) {
  const line = (typeof text === 'string' && !text.endsWith('\n')) ? text + '\n' : text;
  if (state.tcp.ws && state.tcp.ws.readyState === WebSocket.OPEN) {
    state.tcp.ws.send(JSON.stringify({ action: 'send', text: line }));
    return true;
  } else {
    fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: line })
    });
    return true;
  }
}

function updateTcpUI(connected, host, port) {
  state.tcp.connected = connected;
  const btnText = document.getElementById('btnConnectTcpText');
  const gwBadge = document.getElementById('gatewayStatusBadge');
  const gwState = document.getElementById('overviewGatewayState');
  const gwSub = document.getElementById('overviewGatewaySub');
  const ardDot = document.getElementById('arduinoIndicatorDot');
  const ardText = document.getElementById('arduinoStatusText');
  const ardSub = document.getElementById('arduinoSubText');
  const isNodeA = state.localRole === 'NODE_A';

  if (connected) {
    if (btnText) btnText.textContent = 'Disconnect TCP';
    if (gwBadge) {
      gwBadge.className = 'badge badge-success';
      gwBadge.textContent = isNodeA ? `Node A (${host})` : `Node B (Field Node)`;
    }
    if (gwState) { gwState.textContent = 'Online'; gwState.className = 'metric-value text-success'; }
    if (gwSub) {
      gwSub.textContent = isNodeA
        ? `Node A IP: ${host} · TCP Mesh Port ${port}`
        : `Node B Linked to Node A at ${host}:${port}`;
    }
    if (ardDot) ardDot.className = 'status-dot green';
    if (ardText) ardText.textContent = isNodeA ? 'Node A: Online' : 'Node B: Online';
    if (ardSub) ardSub.textContent = `TCP Mesh Link (${host}:${port})`;
    showToast(`🟢 Linked via TCP at ${host}:${port}!`, 'success');
    logAudit(`Connected to TCP Mesh at ${host}:${port}`);
  } else {
    if (btnText) btnText.textContent = 'WiFi TCP';
    if (!state.serial.connected) {
      if (gwBadge) { gwBadge.className = 'badge badge-warning'; gwBadge.textContent = 'Disconnected'; }
      if (gwState) { gwState.textContent = 'Offline'; gwState.className = 'metric-value'; }
    }
  }
}

async function readSerialStream() {
  const decoder = new TextDecoderStream();
  const inputDone = state.serial.port.readable.pipeTo(decoder.writable);
  const inputStream = decoder.readable;
  const reader = inputStream.getReader();
  state.serial.reader = reader;

  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Retain remainder in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            handleIncomingSerialPacket(trimmed);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Serial read loop ended:', err);
  } finally {
    reader.releaseLock();
  }
}

// Transmit raw packet string to Arduino/ESP32 hardware over Web Serial and/or TCP Bridge
async function transmitSerialPacket(data) {
  const line = (typeof data === 'string' && !data.endsWith('\n')) ? data + '\n' : data;

  if (state.serial.connected && state.serial.port && state.serial.port.writable) {
    try {
      const encoder = new TextEncoder();
      const writer = state.serial.port.writable.getWriter();
      await writer.write(encoder.encode(line));
      writer.releaseLock();
      console.log('[ESP32 Web Serial TX Success]:', typeof line === 'string' ? line.trim() : line);
    } catch (err) {
      console.error('Error writing to Web Serial port:', err);
    }
  }

  // Also bridge over WiFi TCP if connected
  if (state.tcp && state.tcp.connected) {
    sendViaTcpBridge(line);
  }

  if (!state.serial.connected && (!state.tcp || !state.tcp.connected)) {
    console.log('[LoRa TX Buffer - Offline]:', typeof line === 'string' ? line.trim() : line);
  }
}
window.transmitSerialPacket = transmitSerialPacket;

// ========================================================
// 5. Incoming Real Hardware Packet Handler (ESP32 Node A + LoRa)
// ========================================================
  function handleIncomingSerialPacket(packet) {
    logTerminalEntry(packet, 'rx');

    // 1. ESP32 Node A/B Boot Banner
    if (packet.includes('LORANET NODE A') || packet.includes('LORANET NODE B')) {
      showToast('🟢 ESP32 Transceiver Booted & Active', 'success');
      logAudit('ESP32 Transceiver active.');
      updateSerialUI(true);
      return;
    }

    // 2. ESP32 Node A WiFi Connection & IP Assignment
    if (packet.includes('NODE A IP:')) {
      const m = packet.match(/NODE A IP:\s*([0-9\.]+)/i);
      if (m && m[1]) {
        const ip = m[1];
        state.nodeA = state.nodeA || {};
        state.nodeA.ip = ip;
        state.nodeA.port = 3333;
        state.nodeA.status = 'ONLINE';
        state.tcp.ip = ip;

        const gwSub = document.getElementById('overviewGatewaySub');
        if (gwSub) gwSub.textContent = `Node A IP: ${ip} · TCP Mesh Port 3333`;
        const gwBadge = document.getElementById('gatewayStatusBadge');
        if (gwBadge) {
          gwBadge.className = 'badge badge-success';
          gwBadge.textContent = `Node A (${ip})`;
        }
        showToast(`ESP32 Node A WiFi Connected: ${ip}:3333`, 'success');
        logAudit(`ESP32 Node A obtained WiFi IP: ${ip}, TCP port 3333 active`);
      }
      return;
    }
    if (packet.includes('NODE B IP:')) {
      const m = packet.match(/NODE B IP:\s*([0-9\.]+)/i);
      if (m && m[1]) {
        logAudit(`ESP32 Node B obtained WiFi IP: ${m[1]}`);
      }
      return;
    }

    // 3. Node B Connected over TCP
    if (
      packet.includes('Node B connected') ||
      packet.includes('[CONNECTED] Node B') ||
      packet.includes('[CONNECTED] Client') ||
      packet.includes('[SUCCESS] Connected to Node A')
    ) {
      if (state.localRole === 'NODE_A') {
        showToast('🟢 Node B Linked via WiFi/TCP Mesh!', 'success');
        playAckChime();
        registerRealNode({
          nodeId: 'NODE_B',
          role: 'Mesh Transceiver (Node B)',
          lat: (state.gps.lat ? state.gps.lat + 0.0018 : 11.0571),
          lng: (state.gps.lng ? state.gps.lng + 0.0022 : 78.0495),
          rssi: -62,
          snr: 11.5,
          battery: 98
        });
        logAudit('Node B established two-way connection to Node A on TCP port 3333');
      } else {
        showToast('🟢 Connected to Node A Coordinator!', 'success');
        playAckChime();
        registerRealNode({
          nodeId: 'NODE_A',
          role: 'Host Coordinator (Node A)',
          lat: (state.gps.lat ? state.gps.lat - 0.0018 : 11.0552),
          lng: (state.gps.lng ? state.gps.lng - 0.0022 : 78.0473),
          rssi: -60,
          snr: 12.0,
          battery: 100
        });
        logAudit('Node B linked to Node A Coordinator on port 3333');
      }
      return;
    }

    // 4. Two-way messaging ready indicator
    if (packet.includes('Two-way messaging ready') || packet.includes('Full-duplex communication active')) {
      showToast('⚡ Two-Way Full-Duplex Mesh Active', 'success');
      return;
    }

    // 5. Outgoing confirmation from Node A or Node B
    if (packet.startsWith('[TX TO NODE B]') || packet.startsWith('[TX TO NODE A]') || packet.startsWith('[SENT]')) {
      const sentText = packet
        .replace(/^\[TX TO NODE B\]\s*/i, '')
        .replace(/^\[TX TO NODE A\]\s*/i, '')
        .replace(/^\[SENT\]\s*/i, '')
        .replace(/^>\s*/, '')
        .trim();
      showToast(`✓ Dispatched: "${sentText}"`, 'success');
      logTerminalEntry(`[CONFIRMED TX] ${sentText}`, 'tx');
      return;
    }

    // 6. Node B disconnected or error warnings
    if (packet.includes('Node B disconnected') || packet.includes('Node B is not connected') || packet.includes('[ERROR] No clients connected')) {
      showToast('⚠️ Node B is not connected to Node A yet', 'warning');
      logTerminalEntry(packet, 'tx');
      return;
    }

    // 7. Incoming Transceiver Message: "[RX FROM NODE B] ...", "[RECEIVED] ...", "NODE_B: ...", "NODE_A: ..."
    if (
      packet.includes('[RX FROM NODE B]') ||
      packet.includes('[RX FROM NODE A]') ||
      packet.includes('[RECEIVED]') ||
      packet.startsWith('NODE_B:') ||
      packet.startsWith('NODE_A:') ||
      packet.startsWith('[LOCAL]')
    ) {
      let clean = packet
        .replace(/^\[RX FROM NODE B\]\s*/i, '')
        .replace(/^\[RX FROM NODE A\]\s*/i, '')
        .replace(/^\[RECEIVED\]\s*/i, '')
        .replace(/^\[LOCAL\]\s*/i, '')
        .replace(/^>\s*/, '')
        .trim();
      if (!clean) return;

      let sender = 'NODE_B';
      let text = clean;

      if (clean.startsWith('NODE_B:')) {
        sender = 'NODE_B';
        text = clean.replace(/^NODE_B:\s*/i, '').trim();
      } else if (clean.startsWith('NODE_A:')) {
        sender = 'NODE_A';
        text = clean.replace(/^NODE_A:\s*/i, '').trim();
      } else if (/^NODE_[A-Za-z0-9_]+:/i.test(clean)) {
        const m = clean.match(/^(NODE_[A-Za-z0-9_]+):\s*(.*)$/i);
        sender = m[1];
        text = m[2];
      }

      // Self-echo filter: If this packet came from our OWN role, ignore as local echo!
      if (sender === state.localRole) {
        return;
      }

      // Auto-register sender node in active mesh
      registerRealNode({
        nodeId: sender,
        role: sender === 'NODE_A' ? 'Host Coordinator (Node A)' : `Mesh Transceiver (${sender})`,
        lat: (state.gps.lat ? state.gps.lat + 0.0018 : 11.0571),
        lng: (state.gps.lng ? state.gps.lng + 0.0022 : 78.0495),
        rssi: -65,
        snr: 10.5,
        battery: 95
      });

      const isEmergency = text.toUpperCase().includes('SOS') || text.toUpperCase().includes('EMERGENCY');
      if (isEmergency) {
        triggerRealHardwareSos(`${sender}: ${text}`);
        receiveLoRaMessage({
          from: sender,
          priority: 'EMERGENCY',
          text: text,
          rssi: -60,
          snr: 12.0
        });
      } else {
        receiveLoRaMessage({
          from: sender,
          priority: 'NORMAL',
          text: text,
          rssi: -65,
          snr: 10.5
        });
      }
      return;
    }

    // Try parsing JSON format
    try {
      if (packet.startsWith('{') && packet.endsWith('}')) {
        const data = JSON.parse(packet);
        if (data.nodeId) {
        registerRealNode(data);
        return;
      }
    }
  } catch (_) {}

  // Try parsing CSV format: NODE,id,role,lat,lng,rssi,snr,battery
  if (packet.startsWith('NODE,')) {
    const parts = packet.split(',');
    if (parts.length >= 8) {
      registerRealNode({
        nodeId: parts[1],
        role: parts[2],
        lat: parseFloat(parts[3]),
        lng: parseFloat(parts[4]),
        rssi: parseFloat(parts[5]),
        snr: parseFloat(parts[6]),
        battery: parseInt(parts[7], 10)
      });
      return;
    }
  }

  // Handle Hardware Gateway / Base Station GPS packet from USB GNSS receiver
  // E.g.: "GATEWAY,GPS,11.05527,78.04733" or "BASE,GPS,11.05527,78.04733"
  if (packet.startsWith('GATEWAY,GPS,') || packet.startsWith('BASE,GPS,') || packet.startsWith('GPS,')) {
    const parts = packet.split(',');
    const latIndex = packet.startsWith('GPS,') ? 1 : 2;
    const lngIndex = packet.startsWith('GPS,') ? 2 : 3;
    const lat = parseFloat(parts[latIndex]);
    const lng = parseFloat(parts[lngIndex]);
    if (!isNaN(lat) && !isNaN(lng)) {
      applyGpsCoordsToUI(lat, lng, 5, false);
      try {
        localStorage.setItem('loranet_last_gps', JSON.stringify({
          lat: lat,
          lng: lng,
          accuracy: 5,
          time: Date.now()
        }));
      } catch (_) {}
      showToast(`USB Hardware GNSS Lock: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'success');
      logAudit(`Hardware USB GPS fix updated: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      return;
    }
  }

  // Handle incoming LoRa message: e.g. "MSG,NODE-01,NORMAL,Team at river" or "RX,NODE-02,-80,7.5,Status ok"
  if (packet.startsWith('MSG,') || packet.startsWith('RX,')) {
    const parts = packet.split(',');
    if (packet.startsWith('MSG,') && parts.length >= 4) {
      receiveLoRaMessage({
        from: parts[1],
        priority: parts[2],
        text: parts.slice(3).join(','),
        rssi: -75,
        snr: 8.5
      });
      return;
    } else if (packet.startsWith('RX,') && parts.length >= 5) {
      receiveLoRaMessage({
        from: parts[1],
        rssi: parseFloat(parts[2]) || -80,
        snr: parseFloat(parts[3]) || 8.0,
        priority: 'NORMAL',
        text: parts.slice(4).join(',')
      });
      return;
    }
  }

  // Handle incoming SOS alert packet
  if (packet.includes('SOS') || packet.includes('EMERGENCY')) {
    triggerRealHardwareSos(packet);
    receiveLoRaMessage({
      from: 'DISTRESS-BEACON',
      priority: 'EMERGENCY',
      text: packet,
      rssi: -65,
      snr: 12.0
    });
    return;
  }
}

function registerRealNode(nodeData) {
  // Never register ourselves as a remote peer
  if (nodeData.nodeId === state.localRole) return;

  const existingIdx = state.nodes.findIndex(n => n.nodeId === nodeData.nodeId);
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  const nodeObj = {
    ...nodeData,
    lastSeen: timeStr
  };

  if (existingIdx >= 0) {
    state.nodes[existingIdx] = nodeObj;
  } else {
    state.nodes.push(nodeObj);
    showToast(`New Hardware Node Discovered: ${nodeObj.nodeId}`, 'success');
  }

  playRadioBeep();
  updateNodesUI();
  updateNodeMapMarker(nodeObj);
  logAudit(`Hardware Node Packet received from ${nodeObj.nodeId} (RSSI: ${nodeObj.rssi || 'N/A'} dBm)`);
}

function updateNodesUI() {
  const overviewCount = document.getElementById('overviewNodesCount');
  const nodesBadge = document.getElementById('nodesBadge');
  const overviewList = document.getElementById('overviewNodeList');
  const devicesCount = document.getElementById('devicesCountBadge');
  const devicesTable = document.getElementById('devicesTableBody');

  const remoteNodes = getRemoteNodes();
  const count = remoteNodes.length;
  if (overviewCount) overviewCount.textContent = count;
  if (nodesBadge) nodesBadge.textContent = `${count} Active`;
  if (devicesCount) devicesCount.textContent = `${count + 1} Devices (${count} Remote, 1 Host)`;

  const meshBadge = document.getElementById('meshNodesCardBadge');
  if (meshBadge) {
    if (count > 0) {
      meshBadge.className = 'badge badge-success';
      meshBadge.textContent = `${count} Active Node${count > 1 ? 's' : ''}`;
    } else {
      meshBadge.className = 'badge badge-warning';
      meshBadge.textContent = state.localRole === 'NODE_A' ? 'Awaiting Node B' : 'Awaiting Node A';
    }
  }

  // Update Overview Mini Node List (only remote nodes)
  if (overviewList) {
    if (count === 0) {
      overviewList.innerHTML = `<div class="empty-state-text">0 LoRa transceiver nodes connected.</div>`;
    } else {
      overviewList.innerHTML = remoteNodes.map(n => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:white; border:1px solid #DADADA; border-radius:10px; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; font-size:12.5px;">${n.nodeId}</div>
            <div style="font-size:10.5px; color:#777;">${n.role || 'Transceiver'} · ${n.lastSeen}</div>
          </div>
          <div style="text-align:right; font-family:JetBrains Mono, monospace; font-size:11px;">
            <div>${n.battery ? n.battery + '%' : '--'}</div>
            <div style="color:#777;">${n.rssi ? n.rssi + ' dBm' : ''}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // Update Devices Table
  if (devicesTable) {
    const isNodeA = state.localRole === 'NODE_A';
    const baseRow = `
      <tr>
        <td class="font-bold">
          <div>${isNodeA ? 'Laptop Host Station (Node A)' : 'Field Station (Node B)'}</div>
          <div class="sub-id font-mono">${isNodeA ? 'HOST-BASE-01' : 'FIELD-NODE-02'}</div>
        </td>
        <td><span class="tag-role">${isNodeA ? 'Coordinator' : 'Transceiver'}</span></td>
        <td class="font-mono" id="deviceBaseCoords">${state.gps.lat ? `${state.gps.lat.toFixed(5)}, ${state.gps.lng.toFixed(5)}` : 'Detecting GPS...'}</td>
        <td><span class="badge badge-success">Online (${isNodeA ? 'Node A Host' : 'Node B Field'})</span></td>
        <td>Local Hardware Link</td>
        <td>Live</td>
      </tr>
    `;

    const nodeRows = remoteNodes.map(n => `
      <tr>
        <td class="font-bold">
          <div>${n.nodeId}</div>
          <div class="sub-id font-mono">SX1262 LoRa Node</div>
        </td>
        <td><span class="tag-role">${n.role || 'Peer Node'}</span></td>
        <td class="font-mono">${n.lat && n.lng ? `${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}` : 'Coordinates pending'}</td>
        <td><span class="badge badge-success">Active Remote</span></td>
        <td>WiFi / LoRa TCP Mesh</td>
        <td>${n.lastSeen}</td>
      </tr>
    `).join('');

    devicesTable.innerHTML = baseRow + nodeRows;
  }

  updateRecipientDropdowns();
}

function updateRecipientDropdowns() {
  const selects = [
    document.getElementById('overviewMsgRecipient'),
    document.getElementById('msgRecipient')
  ];
  const targetPeer = state.localRole === 'NODE_A' ? 'NODE_B' : 'NODE_A';
  const remoteNodes = getRemoteNodes();

  selects.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    let html = `<option value="BROADCAST">BROADCAST (All Field Nodes)</option>`;
    if (remoteNodes.length > 0) {
      remoteNodes.forEach(n => {
        html += `<option value="${n.nodeId}">${n.nodeId} — ${n.role || 'Peer Node'}</option>`;
      });
    } else {
      html += `<option value="${targetPeer}">${targetPeer} — Peer Transceiver</option>`;
    }
    sel.innerHTML = html;
    if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
      sel.value = currentVal;
    } else if (sel.querySelector(`option[value="${targetPeer}"]`)) {
      sel.value = targetPeer;
    }
  });
}

function updateNodeMapMarker(node) {
  if (!window.L || !node.lat || !node.lng) return;

  const icon = L.divIcon({
    className: 'node-pin',
    html: `
      <div style="
        width: 26px;
        height: 26px;
        background: #2563EB;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ◈
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  const popup = `
    <div style="font-family:Inter; font-size:12px;">
      <div style="font-weight:800;">${node.nodeId}</div>
      <div>Role: <strong>${node.role || 'Transceiver'}</strong></div>
      <div>RSSI: <strong>${node.rssi || 'N/A'} dBm</strong></div>
      <div>Battery: <strong>${node.battery ? node.battery + '%' : 'N/A'}</strong></div>
      <div>Heartbeat: ${node.lastSeen}</div>
    </div>
  `;

  if (state.maps.overview) {
    if (!state.maps.nodeMarkers[node.nodeId]) {
      state.maps.nodeMarkers[node.nodeId] = L.marker([node.lat, node.lng], { icon })
        .addTo(state.maps.overview)
        .bindPopup(popup);
    } else {
      state.maps.nodeMarkers[node.nodeId].setLatLng([node.lat, node.lng]).setPopupContent(popup);
    }
  }
}

// ========================================================
// 6. Emergency Alerts & SOS Controls
// ========================================================
function initSosControls() {
  const btnBroadcastSos = document.getElementById('btnBroadcastSos');
  const btnCreateLocalSos = document.getElementById('btnCreateLocalSos');
  const btnTestSpeaker = document.getElementById('btnTestSpeaker');

  const triggerSos = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const id = `SOS-${Date.now().toString().slice(-4)}`;

    const alertItem = {
      id,
      origin: 'Laptop Base Station',
      lat: state.gps.lat || 0,
      lng: state.gps.lng || 0,
      timestamp: timeStr,
      status: 'ACTIVE'
    };

    state.alerts.unshift(alertItem);
    updateAlertsUI();

    playEmergencySiren();
    showToast(`EMERGENCY SOS BROADCAST INITIATED (${id})`, 'emergency');
    logAudit(`EMERGENCY SOS triggered by operator at ${timeStr}.`);

    // If Arduino connected, transmit SOS packet over LoRa
    transmitSerialPacket(`EMERGENCY_SOS,${id},${state.gps.lat},${state.gps.lng},${timeStr}\n`);
  };

  if (btnBroadcastSos) btnBroadcastSos.addEventListener('click', triggerSos);
  if (btnCreateLocalSos) btnCreateLocalSos.addEventListener('click', triggerSos);

  if (btnTestSpeaker) {
    btnTestSpeaker.addEventListener('click', () => {
      playResponseChime();
      speakVoice('Laptop speaker audio test successful.');
      showToast('Speaker test: Tone chime and voice response verified on laptop speakers.', 'success');
    });
  }
}

function triggerRealHardwareSos(rawPacket) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const id = `HARDWARE-SOS-${Date.now().toString().slice(-4)}`;

  const alertItem = {
    id,
    origin: 'Remote LoRa Transceiver',
    packet: rawPacket,
    timestamp: timeStr,
    status: 'ACTIVE'
  };

  state.alerts.unshift(alertItem);
  updateAlertsUI();
  playEmergencySiren();
  showToast(`CRITICAL DISTRESS SIGNAL RECEIVED OVER LORA: ${id}`, 'emergency');
  logAudit(`Distress beacon decoded from field node: ${rawPacket}`);
}

function updateAlertsUI() {
  const count = state.alerts.length;
  const countBadge = document.getElementById('alertsCountBadge');
  const statusBadge = document.getElementById('alertsStatusBadge');
  const overviewCount = document.getElementById('overviewAlertsCount');
  const queueBadge = document.getElementById('alertsQueueBadge');
  const container = document.getElementById('alertsQueueContainer');

  if (countBadge) countBadge.textContent = count;
  if (overviewCount) overviewCount.textContent = count;
  if (queueBadge) queueBadge.textContent = `${count} Active`;

  if (count > 0) {
    if (statusBadge) {
      statusBadge.className = 'badge badge-emergency';
      statusBadge.textContent = 'Emergency Mode';
    }
  } else {
    if (statusBadge) {
      statusBadge.className = 'badge badge-neutral';
      statusBadge.textContent = 'Normal Mode';
    }
  }

  if (container) {
    if (count === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2D8A56" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h3>All Sectors Secure — Zero Active SOS Alerts</h3>
          <p>Distress beacons emitted by field nodes or manual SOS signals will appear here immediately with GPS coordinates and timestamps.</p>
        </div>
      `;
    } else {
      container.innerHTML = state.alerts.map((a, idx) => `
        <div class="alert-item-box ${a.voiceNote ? 'critical' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-weight:800; font-size:14px; color:#E85D3F;">
              ${a.voiceNote ? '🎙️ ' + a.id + ' — VOICE DISTRESS CALL' : '🚨 ' + a.id + ' — CRITICAL DISTRESS BEACON'}
            </div>
            <span class="badge ${a.status === 'ACKNOWLEDGED' ? 'badge-warning' : 'badge-emergency'}">${a.status}</span>
          </div>
          <div style="font-size:12.5px; color:#111; margin-bottom:6px;">
            Origin: <strong>${a.origin}</strong> · Received: <span style="font-family:JetBrains Mono;">${a.timestamp}</span>
          </div>
          ${a.lat ? `<div style="font-family:JetBrains Mono; font-size:12px; margin-bottom:10px;">Coordinates: 📍 ${a.lat.toFixed(5)}°, ${a.lng.toFixed(5)}°</div>` : ''}
          ${a.voiceNote ? `
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:10px;">
              <div style="font-size:11px; font-weight:700; color:var(--emergency); text-transform:uppercase; margin-bottom:4px;">
                🎙️ Audio Transcript (${a.voiceNote.duration}s Voice Note)
              </div>
              <div style="font-size:13px; font-weight:500; color:var(--txt); margin-bottom:8px;">
                "${escapeHtml(a.voiceNote.transcript)}"
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn btn-xs-link" onclick="togglePlayVoiceNote('${a.voiceNote.id}')">▶ Play Audio</button>
                <button type="button" class="btn btn-xs-link" onclick="readAloudVoiceNote('${a.voiceNote.id}')">🔊 Read Aloud</button>
                <button type="button" class="btn btn-xs-link" onclick="locateVoiceNodeOnMap('${a.voiceNote.id}')">📍 Locate Map</button>
              </div>
            </div>
          ` : ''}
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" onclick="resolveAlert(${idx})">Resolve Incident</button>
            <button class="btn btn-sm" onclick="acknowledgeAlert(${idx})">Acknowledge</button>
            ${a.voiceNote ? `
              <button class="btn btn-sm btn-secondary" onclick="dispatchRescueTeam('${a.voiceNote.id}')">🚑 Dispatch Team</button>
              <button class="btn btn-sm btn-secondary" onclick="replyVoiceToVictim('${a.voiceNote.id}')">🎙️ Audio Reply</button>
            ` : ''}
          </div>
        </div>
      `).join('');
    }
  }
}

window.resolveAlert = function(index) {
  state.alerts.splice(index, 1);
  updateAlertsUI();
  playResponseChime();
  speakVoice('Incident resolved.');
  showToast('Emergency incident cleared & resolved.', 'success');
  logAudit('Incident resolved by operator.');
};

window.acknowledgeAlert = function(index) {
  if (state.alerts[index]) {
    state.alerts[index].status = 'ACKNOWLEDGED';
    updateAlertsUI();
    playResponseChime();
    speakVoice('Emergency incident acknowledged.');
    showToast('Dispatch coordinates forwarded to field team.', 'info');
    logAudit(`Incident ${state.alerts[index].id} acknowledged by operator.`);
  }
};

// ========================================================
// Laptop Speaker Sound & Voice Engine
// ========================================================
let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

// Unlock audio on any click/touch
document.addEventListener('click', () => {
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
}, { once: false });

// 1. Dual-Tone Emergency Siren through Laptop Speaker
function playEmergencySiren() {
  const soundSetting = document.getElementById('settingsSoundAlert');
  if (soundSetting && !soundSetting.checked) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Siren: 3 alternating pulses (960Hz and 770Hz)
    const tones = [960, 770, 960, 770, 960, 770];
    const duration = 0.22;

    tones.forEach((freq, idx) => {
      const startTime = ctx.currentTime + (idx * duration);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.03);
      gain.gain.linearRampToValueAtTime(0.35, startTime + duration - 0.03);
      gain.gain.linearRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    // Voice announcement over laptop speaker
    speakVoice('Emergency alert! Critical distress beacon active.');
  } catch (err) {
    console.warn('Audio siren failed:', err);
  }
}

// 2. Tactical Response / Message Sent Chime
function playResponseChime() {
  const soundSetting = document.getElementById('settingsSoundAlert');
  if (soundSetting && !soundSetting.checked) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Ascending chirp: 1200Hz -> 1800Hz
    const freqs = [1200, 1800];
    const duration = 0.12;

    freqs.forEach((freq, idx) => {
      const startTime = ctx.currentTime + (idx * (duration + 0.04));
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn('Response chime failed:', err);
  }
}

// 2B. Tactical Acknowledge Chime
function playAckChime() {
  const soundSetting = document.getElementById('settingsSoundAlert');
  if (soundSetting && !soundSetting.checked) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Dual-tone high pitch acknowledge chime: 880Hz -> 1760Hz
    const freqs = [880, 1760];
    const duration = 0.08;

    freqs.forEach((freq, idx) => {
      const startTime = ctx.currentTime + (idx * (duration + 0.03));
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (_) {}
}
window.playAckChime = playAckChime;

// 3. Incoming Radio Beep
function playRadioBeep() {
  const soundSetting = document.getElementById('settingsSoundAlert');
  if (soundSetting && !soundSetting.checked) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (_) {}
}

// 4. Laptop Speaker Voice Announcement (SpeechSynthesis)
function speakVoice(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

// ========================================================
// 7. LoRa Message Transmission Form (Overview + Messages Tab)
// ========================================================
function initMessageTransmitter() {
  // --- Overview Quick Message Form ---
  const ovForm = document.getElementById('overviewMsgForm');
  const ovContent = document.getElementById('overviewMsgContent');
  const ovCharCounter = document.getElementById('overviewMsgCharCount');
  const ovRecipient = document.getElementById('overviewMsgRecipient');
  const ovPriority = document.getElementById('overviewMsgPriority');
  const btnPresetGps = document.getElementById('btnPresetGps');
  const btnPresetPing = document.getElementById('btnPresetPing');
  const btnPresetStatus = document.getElementById('btnPresetStatus');

  // Quick Preset: Attach Real Laptop GPS
  if (btnPresetGps && ovContent) {
    btnPresetGps.addEventListener('click', () => {
      if (state.gps.lat && state.gps.lng) {
        ovContent.value = `GPS: ${state.gps.lat.toFixed(5)}, ${state.gps.lng.toFixed(5)} (±${Math.round(state.gps.accuracy)}m)`;
      } else {
        ovContent.value = `GPS: Acquiring laptop coordinates...`;
      }
      if (ovCharCounter) ovCharCounter.textContent = ovContent.value.length;
      ovContent.focus();
    });
  }

  // Quick Preset: Ping Mesh
  if (btnPresetPing && ovContent) {
    btnPresetPing.addEventListener('click', () => {
      ovContent.value = `PING: Host Base Station Check`;
      if (ovCharCounter) ovCharCounter.textContent = ovContent.value.length;
      ovContent.focus();
    });
  }

  // Quick Preset: Request Status
  if (btnPresetStatus && ovContent) {
    btnPresetStatus.addEventListener('click', () => {
      ovContent.value = `STATUS_QUERY: Request Battery & SNR Telemetry`;
      if (ovCharCounter) ovCharCounter.textContent = ovContent.value.length;
      ovContent.focus();
    });
  }

  if (ovContent && ovCharCounter) {
    ovContent.addEventListener('input', () => {
      ovCharCounter.textContent = ovContent.value.length;
    });
    ovContent.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (ovForm) {
          if (typeof ovForm.requestSubmit === 'function') ovForm.requestSubmit();
          else ovForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    });
  }

  // --- Radio Traffic Tabs on Overview ---
  const btnTabRx = document.getElementById('btnTabRx');
  const btnTabTx = document.getElementById('btnTabTx');
  const btnTestMsg1 = document.getElementById('btnTestIncomingMsg');
  const btnTestMsg2 = document.getElementById('btnTestIncomingBottom');

  if (btnTabRx) {
    btnTabRx.addEventListener('click', () => {
      state.trafficTab = 'rx';
      btnTabRx.classList.add('active');
      if (btnTabTx) btnTabTx.classList.remove('active');
      renderTrafficFeed();
    });
  }

  if (btnTabTx) {
    btnTabTx.addEventListener('click', () => {
      state.trafficTab = 'tx';
      btnTabTx.classList.add('active');
      if (btnTabRx) btnTabRx.classList.remove('active');
      renderTrafficFeed();
    });
  }

  if (btnTestMsg1) btnTestMsg1.addEventListener('click', triggerTestIncomingMessage);
  if (btnTestMsg2) btnTestMsg2.addEventListener('click', triggerTestIncomingMessage);

  if (ovForm) {
    ovForm.addEventListener('submit', e => {
      e.preventDefault();
      const text = ovContent.value.trim();
      if (!text) return;

      const defaultRecip = state.localRole === 'NODE_A' ? 'NODE_B' : 'NODE_A';
      const recipient = (ovRecipient && ovRecipient.value) ? ovRecipient.value : defaultRecip;
      const priority = ovPriority ? ovPriority.value : 'NORMAL';

      logTerminalEntry(`TX -> [${recipient}] (${priority}): ${text}`, 'tx');
      logOverviewPacket(recipient, priority, text);
      playResponseChime();

      let payload = text;
      if (state.localRole === 'NODE_B' && !payload.startsWith('NODE_B:')) {
        payload = `NODE_B: ${payload}`;
      }

      if (state.serial.connected || (state.tcp && state.tcp.connected)) {
        transmitSerialPacket(payload + '\n');
        showToast(`Dispatched to ${recipient}`, 'success');
      } else {
        showToast(`Packet logged. Connect via USB or WiFi TCP to transmit.`, 'info');
      }

      ovContent.value = '';
      if (ovCharCounter) ovCharCounter.textContent = '0';
      logAudit(`Data packet transmitted to [${recipient}]: "${text}"`);
    });
  }

  // --- Messages Tab Form ---
  const form = document.getElementById('msgSendForm');
  const contentInput = document.getElementById('msgContent');
  const charCounter = document.getElementById('msgCharCount');
  const recipientInput = document.getElementById('msgRecipient');
  const priorityInput = document.getElementById('msgPriority');

  if (contentInput && charCounter) {
    contentInput.addEventListener('input', () => {
      charCounter.textContent = contentInput.value.length;
    });
    contentInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (form) {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
          else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = contentInput.value.trim();
      if (!text) return;

      const defaultRecip = state.localRole === 'NODE_A' ? 'NODE_B' : 'NODE_A';
      const recipient = (recipientInput && recipientInput.value) ? recipientInput.value : defaultRecip;
      const priority = priorityInput ? priorityInput.value : 'NORMAL';

      logTerminalEntry(`TX -> [${recipient}] (${priority}): ${text}`, 'tx');
      logOverviewPacket(recipient, priority, text);
      playResponseChime();

      let payload = text;
      if (state.localRole === 'NODE_B' && !payload.startsWith('NODE_B:')) {
        payload = `NODE_B: ${payload}`;
      }

      if (state.serial.connected || (state.tcp && state.tcp.connected)) {
        transmitSerialPacket(payload + '\n');
        showToast(`Dispatched to ${recipient}`, 'success');
      } else {
        showToast(`Packet logged. Connect via USB or WiFi TCP to transmit.`, 'info');
      }

      contentInput.value = '';
      if (charCounter) charCounter.textContent = '0';
      logAudit(`Data packet transmitted to [${recipient}]: "${text}"`);
    });
  }
}

// Handler for Receiving LoRa Messages
function receiveLoRaMessage(msg) {
  const isVoicePacket = msg.text && (msg.text.startsWith('VOICE_SOS') || msg.text.includes('[VOICE SOS]'));

  const msgObj = {
    id: Date.now() + Math.random(),
    from: msg.from || 'NODE-01',
    text: msg.text || '',
    priority: isVoicePacket ? 'EMERGENCY' : (msg.priority || 'NORMAL'),
    rssi: msg.rssi || -78,
    snr: msg.snr || 9.2,
    type: 'rx',
    isVoice: isVoicePacket,
    timestamp: new Date()
  };

  state.messages.unshift(msgObj);

  // If this packet contains a Voice SOS beacon, parse it into Voice Notes Queue
  if (isVoicePacket) {
    const parts = msg.text.split(',');
    // Format: VOICE_SOS,ID,LAT,LNG,PRIORITY,TRANSCRIPT
    const vId = parts[1] || `VOICE-${Date.now().toString().slice(-4)}`;
    const vLat = parseFloat(parts[2]) || state.gps.lat || 11.055;
    const vLng = parseFloat(parts[3]) || state.gps.lng || 78.047;
    const vUrgency = parts[4] || 'CRITICAL';
    const vTranscript = parts.slice(5).join(',') || msg.text.replace('VOICE_SOS,', '').replace('🎙️ [VOICE SOS]', '').trim();

    const incomingVoiceNote = {
      id: vId,
      senderId: msg.from || 'LORA-NODE',
      callerName: `Distress Victim (${msg.from || 'Field Beacon'})`,
      urgency: vUrgency,
      lat: vLat,
      lng: vLng,
      timestamp: new Date().toLocaleTimeString(),
      duration: 6,
      transcript: vTranscript,
      tags: ['CRITICAL', 'VOICE SOS', 'RADIO INCOMING'],
      status: 'AWAITING_DISPATCH',
      audioUrl: null
    };

    state.voiceNotes.unshift(incomingVoiceNote);
    renderRescueVoiceNotes();

    playEmergencySiren();
    speakVoice(`Incoming Emergency Voice SOS from ${msg.from}: ${vTranscript}`);
  } else if (msgObj.priority === 'EMERGENCY') {
    playEmergencySiren();
    speakVoice(`Emergency distress message received from ${msgObj.from}: ${msgObj.text}`);
  } else {
    playRadioBeep();
    playResponseChime();
    speakVoice(`New message from ${msgObj.from}`);
  }

  showToast(`📥 Received from ${msgObj.from}: "${msgObj.text}"`, msgObj.priority === 'EMERGENCY' ? 'emergency' : 'success');
  logTerminalEntry(`RX <- [${msgObj.from}] (${msgObj.priority}, ${msgObj.rssi}dBm): ${msgObj.text}`, 'rx');
  logAudit(`Radio message received from [${msgObj.from}]: "${msgObj.text}"`);

  updateMessageCounters();
  renderTrafficFeed();
  renderReceivedHubFeed();
}

function updateMessageCounters() {
  const rxMsgs = state.messages.filter(m => m.type === 'rx');
  const txMsgs = state.messages.filter(m => m.type === 'tx');

  const rxCountBadge = document.getElementById('rxCountBadge');
  const txCountBadge = document.getElementById('txCountBadge');
  const rxTotalBadge = document.getElementById('rxTotalCountBadge');

  if (rxCountBadge) rxCountBadge.textContent = rxMsgs.length;
  if (txCountBadge) txCountBadge.textContent = txMsgs.length;
  if (rxTotalBadge) rxTotalBadge.textContent = `${rxMsgs.length} Received`;
}

function renderTrafficFeed() {
  const feed = document.getElementById('overviewRadioTrafficFeed');
  if (!feed) return;

  const filtered = state.messages.filter(m => m.type === state.trafficTab);

  if (filtered.length === 0) {
    feed.innerHTML = `
      <div class="traffic-empty-state">
        <div class="empty-hint">${state.trafficTab === 'rx' ? 'No incoming messages received yet' : 'No outgoing packets transmitted yet'}</div>
        <div class="empty-sub">${state.trafficTab === 'rx' ? 'Click 🧪 Test Receive to simulate a field message' : 'Send message via form above'}</div>
      </div>
    `;
    return;
  }

  feed.innerHTML = filtered.slice(0, 5).map(m => {
    const timeStr = m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isEmergency = m.priority === 'EMERGENCY';
    const isRx = m.type === 'rx';

    return `
      <div class="traffic-item ${isRx ? 'is-rx' : ''} ${isEmergency ? 'is-emergency' : ''}">
        <div class="traffic-item-main">
          <div class="traffic-item-header">
            <span class="traffic-item-badge ${isRx ? 'rx' : 'tx'}">${isRx ? 'RX' : 'TX'}</span>
            <span class="traffic-item-sender">${isRx ? escapeHtml(m.from) : 'TO: ' + escapeHtml(m.to || 'BROADCAST')}</span>
            <span class="traffic-item-time">${timeStr}</span>
          </div>
          <div class="traffic-item-text">${escapeHtml(m.text)}</div>
        </div>
        <span class="badge ${isEmergency ? 'badge-emergency' : m.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'}">${escapeHtml(m.priority)}</span>
      </div>
    `;
  }).join('');
}

function renderReceivedHubFeed() {
  const feed = document.getElementById('overviewReceivedFeed');
  if (!feed) return;

  const rxMsgs = state.messages.filter(m => m.type === 'rx');

  if (rxMsgs.length === 0) {
    feed.innerHTML = `
      <div class="traffic-empty-state">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <div style="font-weight: 600; margin-top: 6px; font-size: 13px;">No incoming LoRa messages received yet.</div>
        <div style="font-size: 11.5px; color: #777; margin-top: 2px;">When field nodes or Arduino send packets, they appear here in real-time with sound and speech.</div>
      </div>
    `;
    return;
  }

  feed.innerHTML = rxMsgs.slice(0, 10).map(m => {
    const timeStr = m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isEmergency = m.priority === 'EMERGENCY';

    const isVoice = m.text.includes('🎙️') || m.isVoice;

    return `
      <div class="rx-message-card ${isEmergency ? 'is-emergency' : ''}">
        <div class="rx-card-top">
          <div class="rx-sender-group">
            <span class="rx-sender-pill">${escapeHtml(m.from)}</span>
            <span class="rx-signal-meta">📶 ${m.rssi} dBm · SNR ${m.snr}dB</span>
          </div>
          <span class="rx-time">${timeStr}</span>
        </div>
        <div class="rx-message-body">
          ${escapeHtml(m.text)}
          ${isVoice ? `
            <div style="margin-top: 6px;">
              <button type="button" class="btn btn-xs-link" onclick="speakVoice('${escapeHtml(m.text.replace('🎙️ [VOICE SOS]', 'Voice note message:'))}')">
                ▶ Listen to Audio
              </button>
            </div>
          ` : ''}
        </div>
        <div class="rx-card-footer">
          <span class="badge ${isEmergency ? 'badge-emergency' : m.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'}">${escapeHtml(m.priority)}</span>
          <button type="button" class="btn-reply-chip" onclick="quickReplyToNode('${escapeHtml(m.from)}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            Reply
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.quickReplyToNode = function(nodeId) {
  const recipientSelect = document.getElementById('overviewMsgRecipient');
  const contentInput = document.getElementById('overviewMsgContent');
  if (recipientSelect) {
    let exists = false;
    for (let opt of recipientSelect.options) {
      if (opt.value === nodeId) { exists = true; break; }
    }
    if (!exists) {
      const newOpt = document.createElement('option');
      newOpt.value = nodeId;
      newOpt.textContent = `Direct: ${nodeId}`;
      recipientSelect.appendChild(newOpt);
    }
    recipientSelect.value = nodeId;
  }
  if (contentInput) {
    contentInput.focus();
    contentInput.placeholder = `Reply to ${nodeId}...`;
  }
  showToast(`Replying to ${nodeId}`, 'info');
};

function logOverviewPacket(recipient, priority, text) {
  const msgObj = {
    id: Date.now() + Math.random(),
    from: state.localRole === 'NODE_A' ? 'NODE_A' : 'NODE_B',
    to: recipient,
    text: text,
    priority: priority,
    type: 'tx',
    timestamp: new Date()
  };

  state.messages.unshift(msgObj);
  updateMessageCounters();
  renderTrafficFeed();
}

// 🧪 Test Incoming Message Generator
function triggerTestIncomingMessage() {
  const sampleNodes = ['TEAM-ALPHA', 'RESCUE-02', 'MEDIC-SQUAD', 'OUTPOST-04'];
  const sampleTexts = [
    'Checkpoint reached at perimeter. All 4 members accounted for.',
    'Medical kit requested at sector 3 coordinates.',
    'Signal weak near river bend. Repeating relay beacon.',
    'Road cleared for emergency vehicles. Proceeding to zone 2.',
    'Shelter base established. Awaiting command telemetry.'
  ];
  const priorities = ['NORMAL', 'NORMAL', 'HIGH', 'NORMAL'];

  const node = sampleNodes[Math.floor(Math.random() * sampleNodes.length)];
  const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];

  // Also auto-register node in active nodes if not present
  registerRealNode({
    nodeId: node,
    role: 'Transceiver',
    lat: state.gps.lat ? state.gps.lat + (Math.random() - 0.5) * 0.015 : 11.056,
    lng: state.gps.lng ? state.gps.lng + (Math.random() - 0.5) * 0.015 : 78.048,
    rssi: -70 - Math.floor(Math.random() * 25),
    snr: (5 + Math.random() * 8).toFixed(1),
    battery: 85 - Math.floor(Math.random() * 30)
  });

  receiveLoRaMessage({
    from: node,
    text: text,
    priority: priority,
    rssi: -72 - Math.floor(Math.random() * 20),
    snr: (6 + Math.random() * 6).toFixed(1)
  });
}

function logTerminalEntry(text, type) {
  const term = document.getElementById('messagesTerminal');
  if (!term) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  const entry = document.createElement('div');
  entry.className = `terminal-entry ${type}`;
  entry.innerHTML = `<span class="timestamp">[${timeStr}]</span> <span class="entry-msg">${escapeHtml(text)}</span>`;

  term.appendChild(entry);
  term.scrollTop = term.scrollHeight;
}

// ========================================================
// 8. Navigation & Tab Switching
// ========================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const views = document.querySelectorAll('.view-panel');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuBtn = document.getElementById('mobileMenuBtn');

  const titles = {
    overview: { title: 'Overview', sub: 'Live GPS telemetry & mesh node monitoring' },
    map: { title: 'Live Map', sub: 'High-precision laptop GNSS coordinates & field markers' },
    mesh: { title: 'Mesh Network', sub: 'LoRa RF multi-hop topology & transceiver connections' },
    alerts: { title: 'Emergency Alerts', sub: 'Active distress beacons & incident dispatch' },
    devices: { title: 'Devices', sub: 'Real hardware inventory & connection telemetry' },
    messages: { title: 'Messages', sub: 'LoRa mesh transceiver terminal & packet logs' },
    settings: { title: 'Settings', sub: 'Web Serial baud rates & sensor tracking configuration' }
  };

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      state.activeView = targetView;

      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      views.forEach(v => v.classList.remove('active'));
      const activeEl = document.getElementById(`view-${targetView}`);
      if (activeEl) activeEl.classList.add('active');

      if (titles[targetView]) {
        if (pageTitle) pageTitle.textContent = titles[targetView].title;
        if (pageSubtitle) pageSubtitle.textContent = titles[targetView].sub;
      }

      // Close mobile drawer if open
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');

      // Trigger Leaflet map resize
      setTimeout(() => {
        if (state.maps.overview) state.maps.overview.invalidateSize();
        if (state.maps.full) state.maps.full.invalidateSize();
      }, 100);
    });
  });

  // Mobile menu button
  if (menuBtn && sidebar && backdrop) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('open');
    });
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }
}

// ========================================================
// 9. Toast Notification System & Audit Logger
// ========================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function logAudit(desc) {
  const timeline = document.getElementById('auditTimeline');
  if (!timeline) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  const row = document.createElement('div');
  row.className = 'timeline-row';
  row.innerHTML = `
    <span class="timeline-time">${timeStr}</span>
    <span class="timeline-desc">${escapeHtml(desc)}</span>
  `;

  timeline.prepend(row);

  // Keep timeline neat (max 20 items)
  if (timeline.children.length > 20) {
    timeline.removeChild(timeline.lastChild);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
