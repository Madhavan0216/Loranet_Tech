# LoraNet

LoraNet is an emergency-response mesh network dashboard built for resilient communication and location tracking. It combines ESP32 LoRa nodes, a web dashboard, real-time server services, and an optional React-based interface.

## Features

- ESP32 LoRa communication nodes
- Emergency alerts and message routing
- Live map and mesh-network visualization
- Device monitoring and status tracking
- Voice-note capture and playback
- Web Serial support
- Real-host GPS and tactical radar views
- TCP and WebSocket mesh communication

## Project Structure

```text
Loranet_Tech/
├── esp32_loranet_node_a/       # ESP32 LoRa firmware for node A
├── esp32_loranet_node_b/       # ESP32 LoRa firmware for node B
└── loranet_emergency/
    ├── index.html              # Main web dashboard
    ├── app.js                  # Dashboard application logic
    ├── server.js               # Unified TCP/WebSocket server
    ├── run.bat                 # Windows launch script
    └── loranet-dashboard/      # React, TypeScript, and Vite dashboard
```

## Requirements

- Windows, macOS, or Linux
- Node.js 18 or later
- An ESP32 board for LoRa node firmware
- A supported LoRa communication module
- A modern web browser

## Quick Start

### 1. Start the unified server

From the `loranet_emergency` directory:

```bash
npm install
node server.js
```

The dashboard will be available at `http://localhost:8765`.

On Windows, you can also run:

```bat
loranet_emergency\run.bat
```

### 2. Start the React dashboard

From the `loranet_emergency/loranet-dashboard` directory:

```bash
npm install
npm run dev
```

Vite will print the local development URL in the terminal.

### 3. Flash an ESP32 node

Open one of the node programs in the Arduino IDE or another ESP32-compatible development environment:

- `esp32_loranet_node_a/esp32_loranet_node_a.ino`
- `esp32_loranet_node_b/esp32_loranet_node_b.ino`

Configure your LoRa pins and radio settings for your hardware, select the connected ESP32 board and serial port, and upload the firmware.

## Development

Build the React dashboard:

```bash
cd loranet_emergency/loranet-dashboard
npm run build
```

Lint the React dashboard:

```bash
npm run lint
```

## Configuration

Before deployment, review the network, radio, and GPS settings in the ESP32 firmware and in `loranet_emergency/server.js`. Adjust ports, pin assignments, and communication parameters to match your hardware.

## Security

Do not expose the dashboard or mesh communication server to a public network without authentication, transport security, access controls, and appropriate validation. LoRa and local network parameters may also need encryption and signed messages for field use.

## License

License information has not yet been added to this project.
