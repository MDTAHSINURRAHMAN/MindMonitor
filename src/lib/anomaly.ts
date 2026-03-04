/**
 * anomaly.ts – Rule-based anomaly detection for sensor readings.
 *
 * checkAnomaly()   – async, used by the API route; queries DB for history.
 * detectAnomaly()  – sync utility kept for unit-test / standalone use.
 */

import { prisma } from "./prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertType =
  | "HIGH_STRESS"
  | "PROLONGED_STRESS"
  | "RAPID_CHANGE"
  | "TEMPERATURE_ANOMALY";

export interface AnomalyPayload {
  type:     AlertType;
  message:  string;
  severity: number; // 1 (info) → 3 (critical)
}

// ── Thresholds ────────────────────────────────────────────────────────────────

const T = {
  temperature: { low: 35.5, high: 37.8 },
  prolongedStressWindow: 5, // consecutive readings at stress ≥ 2
};

// ── Primary async check (used by API route) ───────────────────────────────────

export async function checkAnomaly(data: {
  patientId:   string;
  stressLevel: number;
  temperature: number;
}): Promise<AnomalyPayload | null> {

  // Rule 1: Immediate high stress
  if (data.stressLevel === 3) {
    return {
      type:     "HIGH_STRESS",
      message:  "Patient showing high stress indicators",
      severity: 3,
    };
  }

  // Rule 2: Prolonged medium stress (last N readings all ≥ 2)
  // Wrapped in try/catch so this degrades gracefully when DB is unavailable (dummy mode).
  try {
    const recent = await prisma.sensorReading.findMany({
      where:   { patientId: data.patientId },
      orderBy: { recordedAt: "desc" },
      take:    T.prolongedStressWindow,
      select:  { stressLevel: true },
    });

    if (
      recent.length >= T.prolongedStressWindow &&
      recent.every((r: { stressLevel: number }) => r.stressLevel >= 2)
    ) {
      return {
        type:     "PROLONGED_STRESS",
        message:  `Sustained elevated stress detected for ${T.prolongedStressWindow}+ readings`,
        severity: 2,
      };
    }
  } catch {
    // DB unavailable (dummy/dev mode) – skip prolonged-stress check
  }

  // Rule 3: Temperature out of normal range
  if (data.temperature > T.temperature.high || data.temperature < T.temperature.low) {
    return {
      type:     "TEMPERATURE_ANOMALY",
      message:  `Abnormal temperature reading: ${data.temperature}°C`,
      severity: 2,
    };
  }

  return null;
}

// ── Sync utility (standalone / tests) ────────────────────────────────────────

export interface SyncSensorReading {
  heartRate:            number;
  temperature:          number;
  galvanicSkinResponse?: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity:  "none" | "low" | "medium" | "high";
  triggers:  string[];
}

const SYNC_THRESHOLDS = {
  heartRate:   { low: 50, highWarning: 100, highCritical: 130 },
  temperature: { lowWarning: 35.5, highWarning: 37.8, highCritical: 38.5 },
  gsr:         { highWarning: 20, highCritical: 35 },
};

export function detectAnomaly(reading: SyncSensorReading): AnomalyResult {
  const triggers: string[] = [];
  let maxSeverity: AnomalyResult["severity"] = "none";

  const escalate = (level: AnomalyResult["severity"]) => {
    const order: AnomalyResult["severity"][] = ["none", "low", "medium", "high"];
    if (order.indexOf(level) > order.indexOf(maxSeverity)) maxSeverity = level;
  };

  const { heartRate, temperature, galvanicSkinResponse: gsr } = reading;
  const { heartRate: hr, temperature: temp, gsr: g } = SYNC_THRESHOLDS;

  if (heartRate >= hr.highCritical) {
    triggers.push(`Heart rate critically high (${heartRate} bpm)`); escalate("high");
  } else if (heartRate >= hr.highWarning) {
    triggers.push(`Heart rate elevated (${heartRate} bpm)`); escalate("medium");
  } else if (heartRate < hr.low) {
    triggers.push(`Heart rate low (${heartRate} bpm)`); escalate("low");
  }

  if (temperature >= temp.highCritical) {
    triggers.push(`Temperature critically high (${temperature} °C)`); escalate("high");
  } else if (temperature >= temp.highWarning) {
    triggers.push(`Temperature elevated (${temperature} °C)`); escalate("medium");
  } else if (temperature < temp.lowWarning) {
    triggers.push(`Temperature low (${temperature} °C)`); escalate("low");
  }

  if (gsr !== undefined) {
    if (gsr >= g.highCritical) {
      triggers.push(`GSR critically high (${gsr} µS)`); escalate("high");
    } else if (gsr >= g.highWarning) {
      triggers.push(`GSR elevated (${gsr} µS)`); escalate("medium");
    }
  }

  return { isAnomaly: maxSeverity !== "none", severity: maxSeverity, triggers };
}
