/**
 * Seed data so the dashboard has realistic history the moment it opens.
 * MOCK ONLY: with the real API these lists come from the Laravel database
 * or the ESP32's SD-card log.
 */
import { hashNoise, round, uid } from './random'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function seedAlerts(now) {
  return [
    { m: 4, severity: 'info', type: 'rain_preemption', title: 'Rain preemption triggered', message: 'Irrigation skipped: 86% rain probability ≥ 80% threshold. ~180 L saved.' },
    { m: 27, severity: 'warning', type: 'tank_low', title: 'Water tank low', message: 'Water tank at 18%. Refill soon to keep irrigation running.' },
    { m: 61, severity: 'info', type: 'fertigation', title: 'Fertigation complete', message: 'EC reached 2.02 mS/cm (target 2.00), accuracy 99%.' },
    { m: 96, severity: 'critical', type: 'connection', title: 'Connection lost', message: 'Internet/API unreachable for 3 min. ESP32 ran edge fallback logic and logged to SD card.' },
    { m: 143, severity: 'warning', type: 'soil_dry', title: 'Soil too dry', message: 'Average soil moisture 44% is below the Chili minimum of 50%.' },
    { m: 302, severity: 'critical', type: 'sensor_fault', title: 'Sensor fault · Zone 3', message: 'Soil sensor 3 returned out-of-range readings for 40 s. Excluded from control average.' },
    { m: 420, severity: 'info', type: 'system', title: 'System started', message: 'ESP32 booted, firmware v0.9.3-thesis. SD card mounted.' },
  ].map(({ m, ...a }) => ({ id: uid('al'), ts: now - m * MIN, read: m > 30, ...a }))
}

export function seedSms(now) {
  return [
    { m: 27, to: '+63 917 123 4567', message: 'HydroSync WARNING: Water tank low. Water tank at 18%. Refill soon.', status: 'Sent' },
    { m: 96, to: '+63 917 123 4567', message: 'HydroSync CRITICAL: Connection lost. ESP32 running edge fallback logic.', status: 'Sent' },
    { m: 143, to: '+63 917 123 4567', message: 'HydroSync WARNING: Soil too dry. Avg moisture 44% (min 50%).', status: 'Failed' },
    { m: 302, to: '+63 917 123 4567', message: 'HydroSync CRITICAL: Sensor fault Zone 3. Check wiring.', status: 'Sent' },
  ].map(({ m, ...s }) => ({ id: uid('sms'), ts: now - m * MIN, module: 'SIM800L GSM', ...s }))
}

export function seedCommands(now) {
  return [
    { m: 12, command: 'AUTO · CLOSE Irrigation Valve', source: 'ESP32 auto', result: 'Success', detail: 'Avg moisture 65% ≥ close point 65%', latencyMs: 14 },
    { m: 19, command: 'AUTO · OPEN Irrigation Valve', source: 'ESP32 auto', result: 'Success', detail: 'Avg moisture 49.6% < 50%', latencyMs: 11 },
    { m: 61, command: 'START fertigation → 2.00 mS/cm', source: 'Dashboard', result: 'Success', detail: 'Cycle started', latencyMs: 284 },
    { m: 88, command: 'OPEN Irrigation Valve · 10 min', source: 'Dashboard', result: 'Failed', detail: 'Timeout: no ACK from ESP32', latencyMs: 1200 },
  ].map(({ m, ...c }) => ({ id: uid('cmd'), ts: now - m * MIN, ...c }))
}

export function seedPreemptions(now) {
  return [
    { ago: 4 * MIN, p: 86, moisture: 48.2 },
    { ago: 1 * DAY + 3 * HOUR, p: 91, moisture: 47.5 },
    { ago: 2 * DAY + 7 * HOUR, p: 83, moisture: 49.1 },
    { ago: 4 * DAY + 2 * HOUR, p: 95, moisture: 46.8 },
    { ago: 6 * DAY + 9 * HOUR, p: 81, moisture: 49.6 },
    { ago: 9 * DAY + 5 * HOUR, p: 88, moisture: 48.0 },
  ].map(({ ago, p, moisture }) => ({
    id: uid('rp'),
    ts: now - ago,
    rainProbability: p,
    threshold: 80,
    moistureAvg: moisture,
    savedL: 180,
    crop: 'Chili',
    note: 'Scheduled cycle skipped',
  }))
}

/** Command round-trip latencies (ms) for the performance page. */
export function seedLatencies(now) {
  return Array.from({ length: 24 }, (_, i) => {
    const n = hashNoise(i + 11)
    const path = i % 5 === 0 ? 'local' : i % 3 === 0 ? 'edge' : 'cloud'
    const ms = path === 'edge' ? 10 + Math.abs(n) * 15 : path === 'local' ? 60 + Math.abs(n) * 60 : 220 + n * 90
    return { ts: now - (24 - i) * 20 * MIN, ms: Math.round(ms), path, ok: true }
  })
}

/** 30 minutes of 10-second points leading up to `now`, ending at the current state. */
export function seedTrend(now, s) {
  const points = []
  for (let i = 180; i >= 1; i--) {
    const k = i / 180
    points.push({
      ts: now - i * 10000,
      m1: round(s.moisture[0] + 3 * Math.sin(i / 25) * k + hashNoise(i) * 0.4, 1),
      m2: round(s.moisture[1] + 3 * Math.sin(i / 25 + 1) * k + hashNoise(i + 300) * 0.4, 1),
      m3: round(s.moisture[2] + 3 * Math.sin(i / 25 + 2) * k + hashNoise(i + 600) * 0.4, 1),
      ec: round(s.ec + 0.08 * Math.sin(i / 30) * k + hashNoise(i + 900) * 0.015, 2),
      tank: round(Math.min(100, s.tankLevel + i * 0.03), 1),
      fert: round(Math.min(100, s.fertTankLevel + i * 0.008), 1),
    })
  }
  return points.map((p) => ({ ...p, avg: round((p.m1 + p.m2 + p.m3) / 3, 1) }))
}
