#include <WiFi.h>

// ==========================================
// LORANET NODE B - FULL DUPLEX TCP CLIENT
// ==========================================

const char* ssid = "Mxddy";
const char* password = "87654321";

// ACTUAL NODE A IP FROM YOUR DASHBOARD
IPAddress peerIP(10, 185, 241, 154);

const uint16_t PORT = 3333;

WiFiClient connection;

String txBuffer = "";
String rxBuffer = "";

unsigned long lastRetry = 0;
unsigned long lastWiFiCheck = 0;

void connectToNodeA() {

  if (connection.connected()) return;

  connection.stop();

  Serial.print("\n[TCP] Connecting to Node A: ");
  Serial.print(peerIP);
  Serial.print(":");
  Serial.println(PORT);

  if (connection.connect(peerIP, PORT, 5000)) {

    connection.setNoDelay(true);

    Serial.println("[SUCCESS] Connected to Node A!");

    connection.println("NODE_B: [ONLINE] Ready");

    Serial.println("[READY] Full-duplex communication active.");
  }
  else {
    Serial.println("[ERROR] Connection failed!");
  }
}

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println("\n===== LORANET NODE B =====");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  WiFi.setSleep(false);

  Serial.println("\n[WiFi] Connected!");

  Serial.print("[WiFi] NODE B IP: ");
  Serial.println(WiFi.localIP());

  Serial.print("[TCP] Node A IP: ");
  Serial.println(peerIP);

  connectToNodeA();
}

void loop() {

  // 1. WiFi monitoring
  if (WiFi.status() != WL_CONNECTED) {

    if (millis() - lastWiFiCheck >= 5000) {
      lastWiFiCheck = millis();
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
    }

    return;
  }

  // 2. TCP reconnection
  if (!connection.connected()) {

    connection.stop();

    if (millis() - lastRetry >= 3000) {
      lastRetry = millis();
      connectToNodeA();
    }

    delay(10);
    return;
  }

  // 3. RECEIVE from Node A
  while (connection.available()) {

    char c = connection.read();

    if (c == '\n') {

      rxBuffer.trim();

      if (rxBuffer.length() > 0) {
        Serial.print("\n[RX FROM NODE A] ");
        Serial.println(rxBuffer);
      }

      rxBuffer = "";
    }
    else if (c != '\r' && rxBuffer.length() < 256) {
      rxBuffer += c;
    }
  }

  // 4. TRANSMIT to Node A
  while (Serial.available()) {

    char c = Serial.read();

    if (c == '\n' || c == '\r') {

      txBuffer.trim();

      if (txBuffer.length() > 0) {

        connection.println("NODE_B: " + txBuffer);
        connection.flush();

        Serial.print("[TX TO NODE A] ");
        Serial.println(txBuffer);

        txBuffer = "";
      }
    }
    else if (txBuffer.length() < 256) {
      txBuffer += c;
    }
  }

  delay(2);
}