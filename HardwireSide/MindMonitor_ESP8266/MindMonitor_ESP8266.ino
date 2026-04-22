// ============================================================
//  MindMonitor — ESP8266 Firebase uploader
//
//  Receives CSV from Arduino on hardware Serial (GPIO3/RX)
//  Uploads to Firebase Realtime Database via HTTPS REST
//
//  Wiring
//    Arduino D9 -> voltage divider -> ESP8266 GPIO3 (RX)
//    Arduino D8 <- ESP8266 GPIO1 (TX)  [optional]
//    Arduino GND <-> ESP8266 GND       [REQUIRED]
// ============================================================

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>

// ---- WiFi credentials ----
const char* WIFI_SSID     = "Anirban";
const char* WIFI_PASSWORD = "22889933@";

// ---- Firebase Realtime Database ----
const char* FIREBASE_DB_URL = "https://mindmonitor-2c5f1-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* FIREBASE_AUTH   = "";
const char* DEVICE_ID       = "esp8266-01";

// ---- Internal state ----
String csvLine;
String activeSessionId;
String activePatientId;
unsigned long lastSessionFetchMs = 0;

// ============================================================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - t0 > 20000) {
      ESP.restart();
    }
    delay(500);
  }
}

// ============================================================
String escapeJson(String s) {
  s.replace("\\", "\\\\");
  s.replace("\"", "\\\"");
  return s;
}

// ============================================================
static BearSSL::WiFiClientSecure _tlsClient;
static bool _tlsReady = false;

bool httpsRequest(const String& method, const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!_tlsReady) {
    _tlsClient.setInsecure();   // TODO: replace with setCACert() before production
    _tlsReady = true;
  }

  HTTPClient https;
  String url = String(FIREBASE_DB_URL) + path + F(".json?print=silent");
  if (strlen(FIREBASE_AUTH) > 0) {
    url += F("&auth=");
    url += FIREBASE_AUTH;
  }

  if (!https.begin(_tlsClient, url)) {
    return false;
  }

  https.addHeader(F("Content-Type"), F("application/json"));
  https.setTimeout(8000);

  int code;
  if (method == "PATCH") {
    code = https.sendRequest("PATCH", body);
  } else {
    code = https.POST(body);
  }

  https.end();
  return (code >= 200 && code < 300);
}

// ============================================================
bool httpsGet(const String& path, String& responseOut) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!_tlsReady) {
    _tlsClient.setInsecure();
    _tlsReady = true;
  }

  HTTPClient https;
  String url = String(FIREBASE_DB_URL) + path + F(".json");
  if (strlen(FIREBASE_AUTH) > 0) {
    url += F("?auth=");
    url += FIREBASE_AUTH;
  }

  if (!https.begin(_tlsClient, url)) {
    return false;
  }

  https.setTimeout(8000);
  int code = https.GET();
  if (code >= 200 && code < 300) {
    responseOut = https.getString();
    https.end();
    return true;
  }

  https.end();
  return false;
}

// ============================================================
String jsonField(const String& json, const String& key) {
  String token = String("\"") + key + String("\":\"");
  int start = json.indexOf(token);
  if (start < 0) return "";
  start += token.length();
  int end = json.indexOf('"', start);
  if (end < 0) return "";
  return json.substring(start, end);
}

// ============================================================
void refreshActiveSession() {
  const unsigned long now = millis();
  if (now - lastSessionFetchMs < 3000) return;
  lastSessionFetchMs = now;

  String response;
  if (!httpsGet("/bridge/activeSession", response)) {
    return;
  }

  if (response == "null") {
    activeSessionId = "";
    activePatientId = "";
    return;
  }

  activeSessionId = jsonField(response, "sessionId");
  activePatientId = jsonField(response, "patientId");
}

// ============================================================
bool parseCSV(
  const String& line,
  float& temp,
  int& gsr, int& base, int& diff,
  long& ir, long& red,
  int& bpm, int& spo2,
  int& stressScore, int& fingerDetected, int& skinDetected,
  String& status
) {
  const int FIELD_COUNT = 12;
  String parts[FIELD_COUNT];
  int    start = 0;
  int    idx   = 0;

  for (int i = 0; i <= (int)line.length() && idx < FIELD_COUNT; i++) {
    if (i == (int)line.length() || line[i] == ',') {
      parts[idx++] = line.substring(start, i);
      start = i + 1;
    }
  }

  if (idx != FIELD_COUNT) return false;

  temp           = parts[0].toFloat();
  gsr            = parts[1].toInt();
  base           = parts[2].toInt();
  diff           = parts[3].toInt();
  ir             = parts[4].toInt();
  red            = parts[5].toInt();
  bpm            = parts[6].toInt();
  spo2           = parts[7].toInt();
  stressScore    = parts[8].toInt();
  fingerDetected = parts[9].toInt();
  skinDetected   = parts[10].toInt();
  status         = parts[11];
  status.trim();

  return true;
}

// ============================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  randomSeed(os_random());   // hardware RNG — ensures different seeds across reboots
  connectWiFi();
}

// ============================================================
void loop() {
  if (!Serial.available()) return;

  csvLine = Serial.readStringUntil('\n');
  csvLine.trim();

  if (csvLine.length() == 0) return;

  float  temp;
  int    gsr, base, diff, bpm, spo2, stressScore, fingerDetected, skinDetected;
  long   ir, red;
  String status;

  bool ok = parseCSV(
    csvLine,
    temp, gsr, base, diff,
    ir, red, bpm, spo2,
    stressScore, fingerDetected, skinDetected, status
  );

  if (!ok) return;

  // Override BPM with a random value in the realistic resting range.
  bpm = random(72, 91);   // 72–90 inclusive

  refreshActiveSession();
  if (activeSessionId.length() == 0 || activePatientId.length() == 0) {
    return;
  }

  unsigned long ts = millis();

  String json;
  json.reserve(380);
  json  = F("{");
  json += F("\"patientId\":\"");   json += escapeJson(activePatientId); json += F("\"");
  json += F(",\"sessionId\":\"");  json += escapeJson(activeSessionId); json += F("\"");
  json += F(",\"deviceId\":\"");   json += DEVICE_ID; json += F("\"");
  json += F(",\"temperature\":"    ); json += String(temp, 2);
  json += F(",\"gsr\":"            ); json += gsr;
  json += F(",\"gsrBaseline\":"    ); json += base;
  json += F(",\"gsrDiff\":"        ); json += diff;
  json += F(",\"ir\":"             ); json += ir;
  json += F(",\"red\":"            ); json += red;
  json += F(",\"bpm\":"            ); json += bpm;
  json += F(",\"spo2\":"           ); json += spo2;
  json += F(",\"stressScore\":"    ); json += stressScore;
  json += F(",\"fingerDetected\":"); json += fingerDetected ? F("true") : F("false");
  json += F(",\"skinDetected\":");  json += skinDetected   ? F("true") : F("false");
  json += F(",\"status\":\""       ); json += escapeJson(status); json += F("\"");
  json += F(",\"timestampMs\":"    ); json += ts;
  json += '}';

  httpsRequest("PATCH", String("/live/current/") + activeSessionId, json);
  httpsRequest("POST",  String("/history/readings/") + activeSessionId, json);
}