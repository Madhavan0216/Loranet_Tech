// ====================================================================
// LoraNet Emergency Mesh Dashboard — Unified Server & TCP Bridge
// Zero external dependencies (uses pure Node.js http, net, fs, path, url)
// ====================================================================

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HTTP_PORT = 8765;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Global TCP Bridge State
let tcpClient = null;
let tcpConnected = false;
let targetHost = '10.185.241.154';
let targetPort = 3333;
const wsClients = new Set();

// --------------------------------------------------------------------
// 1. Static HTTP Server
// --------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedUrl = new URL(req.url, baseURL);
  parsedUrl.query = Object.fromEntries(parsedUrl.searchParams.entries());
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Set CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname, parsedUrl);
    return;
  }

  // Default to index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + pathname);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
  });
});

// --------------------------------------------------------------------
// 2. REST API Handlers
// --------------------------------------------------------------------
function handleApiRequest(req, res, pathname, parsedUrl) {
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tcpConnected,
      targetHost,
      targetPort,
      activeWebSockets: wsClients.size
    }));
    return;
  }

  if (pathname === '/api/connect-tcp') {
    const host = parsedUrl.searchParams.get('host') || parsedUrl.searchParams.get('ip') || (parsedUrl.query && (parsedUrl.query.host || parsedUrl.query.ip)) || '127.0.0.1';
    const port = parseInt(parsedUrl.searchParams.get('port') || (parsedUrl.query && parsedUrl.query.port), 10) || 3333;
    connectTcp(host, port, (err) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, host, port }));
      }
    });
    return;
  }

  if (pathname === '/api/disconnect-tcp') {
    disconnectTcp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = JSON.parse(body || '{}');
        const text = json.text || json.message || '';
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Empty text' }));
          return;
        }

        const sent = sendToTcp(text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: sent, text }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

// --------------------------------------------------------------------
// 3. TCP Connection to Node A / Node B
// --------------------------------------------------------------------
function connectTcp(host, port, cb) {
  if (tcpClient) {
    disconnectTcp();
  }

  targetHost = host;
  targetPort = port;
  console.log(`[TCP Bridge] Connecting to Node A/B at ${host}:${port}...`);

  const client = new net.Socket();
  client.setNoDelay(true);

  client.connect(port, host, () => {
    tcpConnected = true;
    tcpClient = client;
    console.log(`[TCP Bridge] Connected successfully to ${host}:${port}!`);
    broadcastWs({ type: 'tcp_status', connected: true, host, port });
    if (cb) cb(null);
  });

  let lineBuffer = '';
  client.on('data', chunk => {
    lineBuffer += chunk.toString('utf-8');
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop(); // Keep remainder

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line) {
        console.log(`[TCP RX <- ${host}:${port}]`, line);
        broadcastWs({ type: 'rx', data: line, timestamp: new Date().toISOString() });
      }
    }
  });

  client.on('error', err => {
    console.warn(`[TCP Bridge Error] ${err.message}`);
    tcpConnected = false;
    broadcastWs({ type: 'tcp_status', connected: false, error: err.message });
    if (cb) cb(err);
  });

  client.on('close', () => {
    console.log(`[TCP Bridge] Disconnected from ${host}:${port}`);
    tcpConnected = false;
    tcpClient = null;
    broadcastWs({ type: 'tcp_status', connected: false, host, port });
  });
}

function disconnectTcp() {
  if (tcpClient) {
    try {
      tcpClient.destroy();
    } catch (_) {}
    tcpClient = null;
  }
  tcpConnected = false;
  broadcastWs({ type: 'tcp_status', connected: false });
}

function sendToTcp(text) {
  const line = text.endsWith('\n') ? text : text + '\n';
  if (tcpClient && tcpConnected) {
    tcpClient.write(line);
    console.log(`[TCP TX -> ${targetHost}:${targetPort}]`, line.trim());
    broadcastWs({ type: 'tx_confirmed', text: line.trim() });
    return true;
  } else {
    console.warn(`[TCP Bridge] Cannot send, TCP not connected to ${targetHost}:${targetPort}`);
    return false;
  }
}

// --------------------------------------------------------------------
// 4. Lightweight Native RFC 6455 WebSocket Implementation
// --------------------------------------------------------------------
server.on('upgrade', (req, socket, head) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsed = new URL(req.url, baseURL);
  if (parsed.pathname !== '/ws' && parsed.pathname !== '/bridge') {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');
  wsClients.add(socket);

  // Send initial state to new client
  sendWs(socket, {
    type: 'init',
    tcpConnected,
    targetHost,
    targetPort
  });

  let messageBuffer = Buffer.alloc(0);

  socket.on('data', buffer => {
    messageBuffer = Buffer.concat([messageBuffer, buffer]);
    while (messageBuffer.length >= 2) {
      const secondByte = messageBuffer[1];
      const isMasked = Boolean(secondByte & 0x80);
      let payloadLength = secondByte & 0x7F;
      let offset = 2;

      if (payloadLength === 126) {
        if (messageBuffer.length < 4) break;
        payloadLength = messageBuffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (messageBuffer.length < 10) break;
        payloadLength = Number(messageBuffer.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (messageBuffer.length < offset + 4) break;
        maskKey = messageBuffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (messageBuffer.length < offset + payloadLength) break;

      const payload = messageBuffer.slice(offset, offset + payloadLength);
      messageBuffer = messageBuffer.slice(offset + payloadLength);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      const opcode = buffer[0] & 0x0F;
      if (opcode === 0x08) {
        // Connection Close
        socket.destroy();
        return;
      } else if (opcode === 0x09) {
        // Ping -> Pong
        const pong = Buffer.from([0x8A, 0x00]);
        socket.write(pong);
      } else if (opcode === 0x01) {
        // Text Frame
        handleWsMessage(socket, payload.toString('utf-8'));
      }
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
  });

  socket.on('error', () => {
    wsClients.delete(socket);
  });
});

function handleWsMessage(socket, raw) {
  try {
    const msg = JSON.parse(raw);
    console.log('[WS Message Received]', msg);

    if (msg.action === 'connect_tcp') {
      const host = msg.host || msg.ip || '127.0.0.1';
      const port = parseInt(msg.port, 10) || 3333;
      connectTcp(host, port);
    } else if (msg.action === 'disconnect_tcp') {
      disconnectTcp();
    } else if (msg.action === 'send' || msg.action === 'tx') {
      const text = msg.text || msg.data || '';
      if (text) {
        sendToTcp(text);
      }
    }
  } catch (_) {
    // If raw plain text
    if (raw && typeof raw === 'string') {
      sendToTcp(raw);
    }
  }
}

function sendWs(socket, data) {
  if (socket.destroyed) return;
  const jsonStr = JSON.stringify(data);
  const payload = Buffer.from(jsonStr, 'utf-8');
  let header;

  if (payload.length <= 125) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function broadcastWs(data) {
  for (const client of wsClients) {
    try {
      sendWs(client, data);
    } catch (_) {}
  }
}

// --------------------------------------------------------------------
// 5. Start Server
// --------------------------------------------------------------------
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('================================================================');
    console.log(` [i] LoraNet Unified Server is ALREADY running on port ${HTTP_PORT}.`);
    console.log(` [+] Web Dashboard:   http://localhost:${HTTP_PORT}`);
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error('[Server Error]', err);
    process.exit(1);
  }
});

server.listen(HTTP_PORT, () => {
  console.log('================================================================');
  console.log('   LORANET DISASTER & EMERGENCY RESPONSE MESH SERVER ONLINE    ');
  console.log('================================================================');
  console.log(` [+] Web Dashboard:   http://localhost:${HTTP_PORT}`);
  console.log(` [+] WebSocket Bridge: ws://localhost:${HTTP_PORT}/ws`);
  console.log(` [+] TCP Mesh Bridge: Target Node Port 3333`);
  console.log(' [*] Real GPS Telemetry + Web Serial (COM9) + WiFi TCP Enabled');
  console.log('================================================================\n');
});

