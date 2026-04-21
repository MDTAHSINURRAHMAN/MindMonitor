// ============================================================
//  MindMonitor — Arduino Mega / Uno sensor node
//  Sends CSV over SoftwareSerial to ESP8266 every 1.5 s
//
//  Wiring
//    Arduino D8  -> ESP8266 GPIO1/TX  (receive only, optional)
//    Arduino D9  -> voltage divider   -> ESP8266 GPIO3/RX
//    Voltage divider: D9 -> 1kΩ -> junction -> ESP RX
//                              junction -> 2kΩ -> GND
//    Arduino GND <-> ESP8266 GND  (REQUIRED)
// ============================================================

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <SoftwareSerial.h>

// ---- Pin definitions ----
#define GSR_PIN        A1
#define ONE_WIRE_BUS   3

// ---- SoftwareSerial to ESP8266 ----
// D8 = RX from ESP TX  (we rarely use this direction)
// D9 = TX to   ESP RX  (must pass through voltage divider → 3.3 V)
SoftwareSerial espSerial(8, 9);

// ---- Decision thresholds ----
const float TEMP_THRESHOLD     = 37.5;
const int   BPM_HIGH_THRESHOLD = 100;
const int   SPO2_LOW_THRESHOLD = 94;

// ---- GSR ----
int gsrBaseline           = 0;
const int GSR_TOUCH_DELTA  = 5;
const int GSR_STRESS_DELTA = 20;

// ---- MAX30102 threshold ----
const long IR_NO_FINGER = 100000L;

// ---- Sensor objects ----
MAX30105         particleSensor;
OneWire          oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// ---- BPM ring buffer ----
const byte RATE_SIZE = 4;
byte  rates[RATE_SIZE];
byte  rateSpot        = 0;
long  lastBeat        = 0;
float beatsPerMinute  = 0.0;
int   beatAvg         = 0;

// ---- SpO2 ----
int spo2 = 0;

// ---- Timing ----
unsigned long lastSend   = 0;
const unsigned long SEND_INTERVAL = 1500;   // ms

// ============================================================
void resetHeartData() {
  beatsPerMinute = 0.0;
  beatAvg        = 0;
  lastBeat       = 0;
  rateSpot       = 0;
  for (byte i = 0; i < RATE_SIZE; i++) rates[i] = 0;
}

// ============================================================
void calibrateGSR() {
  long sum = 0;
  const int samples = 150;

  Serial.println(F("Calibrating GSR — keep finger OFF sensor for 4 s..."));
  for (int i = 0; i < samples; i++) {
    sum += analogRead(GSR_PIN);
    delay(25);
  }
  gsrBaseline = (int)(sum / samples);
  Serial.print(F("GSR baseline = "));
  Serial.println(gsrBaseline);
}

// ============================================================
void setup() {
  Serial.begin(115200);      // USB debug — human-readable
  // espSerial.begin(9600);     // to ESP8266 — keep low for SoftwareSerial stability
  delay(500);

  Wire.begin();
  tempSensor.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(F("MAX30102 not found! Check wiring."));
    while (1) { delay(1000); }
  }

  particleSensor.setup(
    60,    // LED brightness
    4,     // sample average
    2,     // LED mode: Red + IR
    400,   // sample rate
    411,   // pulse width
    4096   // ADC range
  );
  particleSensor.setPulseAmplitudeRed(0x24);
  particleSensor.setPulseAmplitudeIR(0x24);
  particleSensor.setPulseAmplitudeGreen(0);

  resetHeartData();
  calibrateGSR();

  Serial.println(F("Sensor ready. Place finger on MAX30102 and touch GSR pads."));
}

// ============================================================
void loop() {
  particleSensor.check();

  long  irValue    = particleSensor.getIR();
  long  redValue   = particleSensor.getRed();
  int   gsrValue   = analogRead(GSR_PIN);

  tempSensor.requestTemperatures();
  float temperature = tempSensor.getTempCByIndex(0);

  int  gsrDiff         = abs(gsrValue - gsrBaseline);
  bool skinDetected    = (gsrDiff >= GSR_TOUCH_DELTA);
  bool gsrStress       = (gsrDiff >= GSR_STRESS_DELTA);
  bool fingerDetected  = (irValue > IR_NO_FINGER);

  // ---- BPM detection ----
  if (fingerDetected && checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat   = millis();

    if (delta > 0) {
      beatsPerMinute = 60000.0 / (float)delta;   // delta in ms → BPM

      if (beatsPerMinute > 20 && beatsPerMinute < 255) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
        beatAvg = 0;
        for (byte i = 0; i < RATE_SIZE; i++) beatAvg += rates[i];
        beatAvg /= RATE_SIZE;
      }
    }
  }

  if (!fingerDetected) {
    resetHeartData();
    spo2 = 0;
  }

  // ---- Estimated SpO2 (simple R-ratio method) ----
  if (fingerDetected && irValue > 0 && redValue > 0) {
    float ratio = (float)redValue / (float)irValue;
    spo2 = constrain((int)(110 - 25 * ratio), 80, 100);
  }

  // ---- Stress decision ----
  int stressScore = 0;
  const char* statusText = "Normal";

  if (!fingerDetected) {
    statusText = "No Finger";
  } else {
    if (gsrStress)                                                     stressScore++;
    if (temperature != DEVICE_DISCONNECTED_C && temperature > TEMP_THRESHOLD) stressScore++;
    if (beatAvg > BPM_HIGH_THRESHOLD)                                  stressScore++;
    if (spo2 > 0 && spo2 < SPO2_LOW_THRESHOLD)                        stressScore++;

    if (!skinDetected) {
      statusText = "No Skin";
    } else if (stressScore >= 3) {
      statusText = "High Stress";
    } else if (stressScore == 2) {
      statusText = "Mild Stress";
    } else {
      statusText = "Normal";
    }
  }

  // ---- Periodic output ----
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    // --- USB Serial monitor (human-readable) ---
    // Serial.print(F("Temp:"));
    // if (temperature == DEVICE_DISCONNECTED_C) Serial.print(F("ERR"));
    // else { Serial.print(temperature, 1); Serial.print('C'); }
    // Serial.print(F(" GSR:")); Serial.print(gsrValue);
    // Serial.print(F(" Base:")); Serial.print(gsrBaseline);
    // Serial.print(F(" Diff:")); Serial.print(gsrDiff);
    // Serial.print(F(" IR:")); Serial.print(irValue);
    // Serial.print(F(" RED:")); Serial.print(redValue);
    // Serial.print(F(" BPM:"));
    // if (fingerDetected && beatAvg > 0) Serial.print(beatAvg);
    // else Serial.print(fingerDetected ? F("calc") : F("0"));
    // Serial.print(F(" SpO2:")); Serial.print(spo2);
    // Serial.print(F(" Stress:")); Serial.print(stressScore);
    // Serial.print(F(" Status:")); Serial.println(statusText);

    // --- CSV line to ESP8266 ---
    // Format: temp,gsr,base,diff,ir,red,bpm,spo2,stressScore,fingerDetected,skinDetected,status
    // NOTE: statusText must NOT contain commas — current values are safe
    float sendTemp = (temperature == DEVICE_DISCONNECTED_C) ? -127.0 : temperature;

    Serial.print(sendTemp, 2);   Serial.print(',');
    Serial.print(gsrValue);      Serial.print(',');
    Serial.print(gsrBaseline);   Serial.print(',');
    Serial.print(gsrDiff);       Serial.print(',');
    Serial.print(irValue);       Serial.print(',');
    Serial.print(redValue);      Serial.print(',');
    Serial.print(beatAvg);       Serial.print(',');
    Serial.print(spo2);          Serial.print(',');
    Serial.print(stressScore);   Serial.print(',');
    Serial.print(fingerDetected  ? 1 : 0); Serial.print(',');
    Serial.print(skinDetected    ? 1 : 0); Serial.print(',');
    Serial.println(statusText);   // println adds \n which ESP reads as line terminator
  }
}
