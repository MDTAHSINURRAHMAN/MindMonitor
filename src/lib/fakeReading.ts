export interface LiveReading {
  patientId: string;
  sessionId: string;
  bpm: number;
  spo2: number;
  temperature: number;
  gsr: number;
  gsrBaseline: number;
  gsrDiff: number;
  ir: number;
  red: number;
  fingerDetected: boolean;
  skinDetected: boolean;
  stressScore: number;
  status: 'normal' | 'elevated' | 'high';
  timestampMs: number;
}

/** Keeps values within bounds with smooth random-walk steps. */
function walk(current: number, min: number, max: number, step: number): number {
  const next = current + (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, next));
}

/** Mutable state for the random-walk generator — lives in the SSE closure. */
export interface GeneratorState {
  bpm: number;
  spo2: number;
  temperature: number;
  gsr: number;
}

export function initialState(): GeneratorState {
  return { bpm: 72, spo2: 98, temperature: 36.6, gsr: 500 };
}

export function nextReading(
  state: GeneratorState,
  patientId: string,
  sessionId: string,
): LiveReading {
  state.bpm         = walk(state.bpm,         55,  115, 3);
  state.spo2        = walk(state.spo2,         94,  100, 0.3);
  state.temperature = walk(state.temperature, 36.0, 38.0, 0.1);
  state.gsr         = walk(state.gsr,         380,  720, 18);

  const gsrBaseline = 500;
  const gsrDiff     = Math.round(state.gsr - gsrBaseline);

  // stressScore correlated with GSR elevation and elevated heart rate
  const rawStress =
    Math.max(0, gsrDiff) * 0.45 +
    Math.max(0, state.bpm - 75) * 0.9 +
    (Math.random() - 0.5) * 12;
  const stressScore = Math.min(100, Math.max(0, Math.round(rawStress)));

  const status: LiveReading['status'] =
    stressScore > 60 ? 'high' : stressScore > 30 ? 'elevated' : 'normal';

  return {
    patientId,
    sessionId,
    bpm:           Math.round(state.bpm),
    spo2:          parseFloat(state.spo2.toFixed(1)),
    temperature:   parseFloat(state.temperature.toFixed(1)),
    gsr:           Math.round(state.gsr),
    gsrBaseline,
    gsrDiff,
    ir:            Math.round(12000 + (Math.random() - 0.5) * 2000),
    red:           Math.round(11000 + (Math.random() - 0.5) * 2000),
    fingerDetected: true,
    skinDetected:   true,
    stressScore,
    status,
    timestampMs:   Date.now(),
  };
}

/** Map a LiveReading to the SensorReading Prisma fields. */
export function toSensorReadingData(r: LiveReading) {
  const stressLevel = r.stressScore > 60 ? 3 : r.stressScore > 30 ? 2 : 1;
  const stressLabel =
    stressLevel === 3 ? 'High Stress'
    : stressLevel === 2 ? 'Slightly Stressed'
    : 'Normal';
  const resistance = parseFloat(((1024 - r.gsr) / r.gsr * 100).toFixed(1));

  return {
    gsrRaw:     r.gsr,
    resistance,
    stressLevel,
    stressLabel,
    temperature: r.temperature,
    heartRate:   r.bpm,
    spo2:        r.spo2,
  };
}
