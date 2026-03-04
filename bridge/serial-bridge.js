/**
 * serial-bridge.js
 * Reads Arduino output from a COM port and POSTs sensor readings to Next.js.
 *
 * Usage:
 *   ARDUINO_API_KEY=<key> PATIENT_ID=<uuid> node bridge/serial-bridge.js
 *
 * Arduino Serial format (two lines per loop):
 *   Line 1 (CSV):   gsrRaw,resistance,stressNumeric,temperature
 *   Line 2 (human): GSR Raw: 512 | Resistance: ...  ← skipped
 */

'use strict';

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// ── Configuration ────────────────────────────────────────────────────────────
const COM_PORT   = process.env.COM_PORT   ?? 'COM3';
const BAUD_RATE  = Number(process.env.BAUD_RATE ?? 9600);
const API_URL    = process.env.API_URL    ?? 'http://localhost:3000/api/sensor';
const API_KEY    = process.env.ARDUINO_API_KEY;
const PATIENT_ID = process.env.PATIENT_ID;

if (!API_KEY)    { console.error('❌  ARDUINO_API_KEY env var not set'); process.exit(1); }
if (!PATIENT_ID) { console.error('❌  PATIENT_ID env var not set');      process.exit(1); }

// ── Serial connection ─────────────────────────────────────────────────────────
const port = new SerialPort({ path: COM_PORT, baudRate: BAUD_RATE });

port.on('open', () => console.log(`✅  Serial port ${COM_PORT} opened at ${BAUD_RATE} baud`));
port.on('error', (err) => {
  console.error('Serial error:', err.message);
  process.exit(1);
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// ── Stress label map ──────────────────────────────────────────────────────────
const STRESS_LABELS = {
  1: 'Relaxed',
  2: 'Slightly Stressed',
  3: 'Stressed',
};

// ── Data handler ──────────────────────────────────────────────────────────────
parser.on('data', async (line) => {
  const trimmed = line.trim();

  // CSV line has exactly 4 comma-separated numeric fields
  const parts = trimmed.split(',');
  if (parts.length !== 4) return; // skip human-readable lines

  const [gsrRaw, resistance, stressLevel, temperature] = parts.map(Number);

  // Guard: reject if any value is NaN
  if ([gsrRaw, resistance, stressLevel, temperature].some(isNaN)) return;

  const payload = {
    patientId:   PATIENT_ID,
    gsrRaw:      Math.round(gsrRaw),
    resistance,
    stressLevel: Math.round(stressLevel),
    stressLabel: STRESS_LABELS[Math.round(stressLevel)] ?? 'Unknown',
    temperature,
  };

  try {
    const { data } = await axios.post(API_URL, payload, {
      headers: { 'x-api-key': API_KEY },
      timeout: 5000,
    });
    console.log(`[${new Date().toISOString()}] ✅  Sent → id=${data.id}  stress=${stressLevel}  temp=${temperature}°C`);
  } catch (err) {
    const status = err.response?.status;
    console.error(`[${new Date().toISOString()}] ❌  POST failed (${status ?? err.message})`);
  }
});
