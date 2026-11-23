#include <WiFi.h>

// ==========================================
// LORANET NODE A - FULL DUPLEX TCP SERVER
// Supports MULTIPLE clients (Node B + Dashboard TCP Bridge)
// Relays messages between Serial <-> TCP and between TCP clients
// ==========================================

const char* ssid = "Mxddy";
const char* password = "87654321";

const uint16_t PORT = 3333;
const int MAX_CLIENTS = 4;

WiFiServer server(PORT);
WiFiClient clients[MAX_CLIENTS];
String clientRxBuffers[MAX_CLIENTS];

String txBuffer = "";
unsigned long lastWiFiCheck = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=====================================");
  Serial.println("=== LORANET NODE A TRANSCEIVER ===");
  Serial.println("=====================================");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi '");
  Serial.print(ssid);
  Serial.print("'");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    WiFi.setSleep(false);

    Serial.println("\nWiFi connected!");
    Serial.print("NODE A IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Gateway    : ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("[WiFi] Subnet     : ");
    Serial.println(WiFi.subnetMask());

    server.begin();
    Serial.println("TCP server started on port 3333");
    Serial.println("Waiting for Node B...\n> ");
  } else {
    Serial.println("\n[WiFi] Connection timed out. Background reconnection active.");
    Serial.println("[WiFi] Ensure hotspot 'Mxddy' is enabled (2.4 GHz).");
  }
}

int countConnectedClients() {
  int count = 0;
  for (int i = 0; i < MAX_CLIENTS; i++) {
    if (clients[i] && clients[i].connected()) count++;
  }
  return count;
}

void loop() {

  // 1. Maintain WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiCheck >= 5000) {
      lastWiFiCheck = millis();
      Serial.println("[WiFi] Reconnecting to WiFi...");
      WiFi.reconnect();
    }
    delay(50);
    return;
  }

  // 2. Accept new incoming clients (Node B, Web TCP Bridge, etc.)
  WiFiClient newClient = server.accept();
  if (newClient && newClient.connected()) {
    newClient.setNoDelay(true);
    newClient.setTimeout(100);

    IPAddress remIp = newClient.remoteIP();
    int slot = -1;

    // Check if this IP already has a stale slot
    for (int i = 0; i < MAX_CLIENTS; i++) {
      if (clients[i] && clients[i].remoteIP() == remIp) {
        clients[i].stop();
        slot = i;
        break;
      }
    }

    // Find first free slot
    if (slot == -1) {
      for (int i = 0; i < MAX_CLIENTS; i++) {
        if (!clients[i] || !clients[i].connected()) {
          slot = i;
          break;
        }
      }
    }

    if (slot != -1) {
      clients[slot] = newClient;
      clientRxBuffers[slot] = "";

      Serial.print("\n[CONNECTED] Client from IP: ");
      Serial.println(remIp);
      Serial.println("Node B connected!");
      Serial.println("Two-way messaging ready.\n> ");
    } else {
      Serial.println("\n[WARN] Max clients reached. Refusing connection.");
      newClient.stop();
    }
  }

  // 3. RECEIVE from all connected TCP clients and relay
  for (int i = 0; i < MAX_CLIENTS; i++) {
    if (clients[i] && clients[i].connected()) {
      while (clients[i].available()) {
        char c = (char)clients[i].read();
        if (c == '\n') {
          clientRxBuffers[i].trim();
          if (clientRxBuffers[i].length() > 0) {
            // Print to Serial (so dashboard via USB can see it too)
            Serial.print("\n[RX FROM NODE B] ");
            Serial.println(clientRxBuffers[i]);
            Serial.print("> ");

            // Relay to ALL OTHER connected TCP clients (mesh routing)
            for (int j = 0; j < MAX_CLIENTS; j++) {
              if (j != i && clients[j] && clients[j].connected()) {
                clients[j].println(clientRxBuffers[i]);
                clients[j].flush();
              }
            }
          }
          clientRxBuffers[i] = "";
        } else if (c != '\r' && clientRxBuffers[i].length() < 256) {
          clientRxBuffers[i] += c;
        }
      }
    }
  }

  // 4. TRANSMIT: Read from Serial and send to ALL connected TCP clients
  while (Serial.available()) {
    char c = (char)Serial.read();

    if (c == '\n' || c == '\r') {
      txBuffer.trim();

      if (txBuffer.length() > 0) {
        int sent = 0;
        for (int i = 0; i < MAX_CLIENTS; i++) {
          if (clients[i] && clients[i].connected()) {
            clients[i].println("NODE_A: " + txBuffer);
            clients[i].flush();
            sent++;
          }
        }

        if (sent > 0) {
          Serial.print("[TX TO NODE B] ");
          Serial.println(txBuffer);
          Serial.print("> ");
        } else {
          Serial.println("[ERROR] No clients connected!");
        }

        txBuffer = "";
      }
    } else if (txBuffer.length() < 256) {
      txBuffer += c;
    }
  }

  delay(2);
}
