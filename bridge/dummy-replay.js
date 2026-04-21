/**
 * dummy-replay.js
 * Replays dummy-sensor-data.json to the Next.js API at a configurable interval.
 * Run this instead of serial-bridge.js while the Arduino is not yet connected.
 *
 * Usage:
 *   ARDUINO_API_KEY=<key> PATIENT_ID=<uuid> node bridge/dummy-replay.js
 *
 * Optional env vars:
 *   INTERVAL_MS  – delay between readings in ms (default: 3000)
 *   API_URL      – endpoint (default: http://localhost:3000/api/sensor)
 *   LOOP         – set to "true" to replay indefinitely (default: false)
 */

'use strict';

const axios    = require('axios');
const readings = require('./dummy-sensor-data.json').readings;

const API_URL     = process.env.API_URL     ?? 'http://localhost:3000/api/sensor';
const SESSIONS_URL = process.env.SESSIONS_URL ?? 'http://localhost:3000/api/sessions';
const API_KEY     = process.env.ARDUINO_API_KEY;
const PATIENT_ID  = process.env.PATIENT_ID;
const DEVICE_ID   = process.env.DEVICE_ID ?? 'dummy-replay';
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 3000);
const LOOP        = process.env.LOOP === 'true';

if (!API_KEY)    { console.error('❌  ARDUINO_API_KEY env var not set'); process.exit(1); }
if (!PATIENT_ID) { console.error('❌  PATIENT_ID env var not set');      process.exit(1); }

async function getActiveSessionId() {
  try {
    const { data } = await axios.get(`${SESSIONS_URL}?patientId=${encodeURIComponent(PATIENT_ID)}`, {
      timeout: 5000,
    });
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function replay() {
  let index = 0;

  const send = async () => {
    const entry = readings[index % readings.length];

    const sessionId = await getActiveSessionId();
    if (!sessionId) {
      console.log(`[${new Date().toISOString()}] ⏸️  No active session for patient ${PATIENT_ID}; skipping reading`);
      setTimeout(send, INTERVAL_MS);
      return;
    }

    // Strip meta fields before sending
    const { _comment: _c, _scenario: _s, ...reading } = entry;

    const payload = {
      ...reading,
      patientId: PATIENT_ID,
      sessionId,
      deviceId: DEVICE_ID,
    };

    try {
      const { data } = await axios.post(API_URL, payload, {
        headers: { 'x-api-key': API_KEY },
        timeout: 5000,
      });
      const scenario = entry._scenario ? ` [${entry._scenario}]` : '';
      console.log(
        `[${new Date().toISOString()}] ✅  #${index + 1}${scenario} ` +
        `→ id=${data.id} session=${sessionId} stress=${reading.stressLevel} temp=${reading.temperature}°C`,
      );
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌  ${err.response?.status ?? err.message}`);
    }

    index++;

    if (index < readings.length || LOOP) {
      setTimeout(send, INTERVAL_MS);
    } else {
      console.log('\n✅  All dummy readings sent. Set LOOP=true to replay continuously.');
    }
  };

  console.log(`▶  Replaying ${readings.length} dummy readings → ${API_URL}`);
  console.log(`   Interval: ${INTERVAL_MS}ms   Loop: ${LOOP}\n`);
  send();
}

replay();
