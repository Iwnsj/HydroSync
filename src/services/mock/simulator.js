/**
 * HydroSync device simulator (MOCK ONLY)
 * ─────────────────────────────────────────────────────────────────────────────
 * A small physics + firmware model that stands in for the ESP32 until the real
 * hardware/API is connected. It ticks every 2 s and behaves like the field rig:
 *
 *  • Soil moisture dries out over time (evapotranspiration) and rises while the
 *    irrigation valve is open or when rain actually falls.
 *  • EC/TDS slowly drops (plant uptake), rises while the fertilizer valve
 *    injects from Tank F, and is diluted by plain irrigation water.
 *  • The water tank drains while irrigating; Tank F drains while injecting.
 *    Both "refill" when nearly empty (float switch / farmer refill).
 *  • In Automatic mode it runs the same rules the firmware will run: open below
 *    the crop's min moisture, close at the recovery point, skip when rain
 *    probability ≥ threshold (rain preemption), dose fertigation when EC is low.
 *  • Random internet outages (Cloud mode) switch on edge-fallback logic; rare
 *    sensor faults; GSM SMS for warning/critical alerts; SD-card logging.
 *
 * Time is "sped up" so a demo shows full cycles within minutes.
 * Nothing in the UI imports this file directly; everything goes through
 * services/telemetryService.js so it can be swapped for the real backend.
 */
import { CROPS } from '../../data/crops'
import { HARDWARE, VALVES } from '../../config/device'
import { fertigationTarget, irrigationCloseAt } from '../../utils/controlLogic'
import { chance, clamp, delay, hashNoise, jitter, rand, randInt, round, uid } from './random'
import { seedAlerts, seedCommands, seedLatencies, seedPreemptions, seedSms, seedTrend } from './seed'

export const TICK_MS = 2000
const TICK_MIN = TICK_MS / 60000
const { irrigationFlowLpm, tankCapacityL, fertFlowLpm, fertTankCapacityL } = HARDWARE

// Per-zone rates in % per tick (accelerated for the demo).
const DRY_RATE = [0.05, 0.042, 0.058]
const WET_RATE = [0.55, 0.48, 0.6]
// A simulated rain front passes roughly every 8 minutes so preemption is visible in a demo.
const RAIN_FRONT_PERIOD_MS = 8 * 60 * 1000
const TREND_STEP_MS = 10000
const TREND_WINDOW_MS = 30 * 60 * 1000

export class CommandError extends Error {
  constructor(message, entry) {
    super(message)
    this.name = 'CommandError'
    this.entry = entry
  }
}

/** Simulated OpenWeatherMap "One Call" hourly forecast. */
function buildForecast(t) {
  const phase = (t / RAIN_FRONT_PERIOD_MS) * Math.PI * 2
  const hourStart = Math.floor(t / 3.6e6) * 3.6e6
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const ts = hourStart + i * 3.6e6
    const hourAbs = ts / 3.6e6
    const pop = clamp(Math.round(36 + 52 * Math.sin(phase - i * 0.45) + hashNoise(hourAbs) * 6), 0, 100)
    const hod = new Date(ts).getHours()
    const temp = round(27 + 5 * Math.sin(((hod - 9) / 24) * Math.PI * 2) - pop * 0.03 + hashNoise(hourAbs + 3) * 0.6, 1)
    const humidity = clamp(Math.round(58 + pop * 0.32 + hashNoise(hourAbs + 7) * 4), 35, 99)
    const rainMm = pop > 60 ? round(((pop - 60) / 40) * 4, 1) : 0
    return { ts, pop, temp, humidity, rainMm, condition: pop >= 80 ? 'Rain' : pop >= 50 ? 'Clouds' : 'Clear' }
  })
  const next3 = hourly.slice(0, 3)
  return {
    fetchedAt: t,
    source: 'OpenWeatherMap One Call 3.0 (simulated)',
    location: 'Field test plot · placeholder coordinates',
    current: {
      temp: hourly[0].temp,
      humidity: hourly[0].humidity,
      pop: Math.max(...next3.map((h) => h.pop)),
      condition: hourly[0].condition,
      windKph: round(8 + Math.abs(hashNoise(hourStart / 3.6e6 + 13)) * 6, 1),
    },
    hourly,
  }
}

function createSimulator() {
  const listeners = new Set()
  const boot = Date.now()
  let failMode = false
  let configured = false

  /** Config pushed from the dashboard (crop thresholds, alert settings, connection mode). */
  let cfg = {
    thresholds: { ...CROPS[0].stages.vegetative },
    cropName: 'Chili',
    alertThresholds: { lowTank: 20, lowFert: 15 },
    recipients: ['+63 917 123 4567'],
    smsEnabled: true,
    connectionMode: 'cloud',
    esp32Ip: '192.168.4.1',
  }

  /** Device state ("what the ESP32 knows"). */
  const s = {
    tick: 0,
    ts: boot,
    moisture: [58.4, 62.1, 55.7],
    ec: 1.86,
    tankLevel: 68,
    fertTankLevel: 57,
    valves: { irrigation: false, fertilizer: false },
    mode: 'auto',
    manualRun: null, // { valveId, startedAt, endsAt, durationMin }
    fertigation: null, // { startedAt, startEc, targetEc, trigger, fertAtStart }
    lastFertigationEnd: 0,
    irrigationRun: null,
    fertValveRun: null,
    rainProbability: 0,
    preempted: false,
    raining: false,
    preemptEpisode: false,
    internetUp: true,
    outageUntil: 0,
    lastCloudSync: boot,
    sensorFault: null, // { index, since, until }
    tankRefilling: false,
    fertRefilling: false,
    waterUsedTodayL: 142.6,
    sd: { logged: 18240, synced: 18240 },
    fallback: { totalMs: 0, upMs: 0 },
  }

  const logs = {
    alerts: seedAlerts(boot),
    sms: seedSms(boot),
    commands: seedCommands(boot),
    preemptions: seedPreemptions(boot),
    events: [],
    latencies: seedLatencies(boot),
  }
  let forecast = buildForecast(boot)
  let trend = seedTrend(boot, s)
  const activeAlerts = new Set()
  const lastRaised = {}

  /* ── helpers ─────────────────────────────────────────────────────────── */

  const edgeFallback = () => cfg.connectionMode === 'offline' || (cfg.connectionMode === 'cloud' && !s.internetUp)
  const commandPath = () => (cfg.connectionMode === 'local' ? 'local' : 'cloud')
  const valveName = (id) => VALVES.find((v) => v.id === id)?.name ?? id

  function avgMoisture() {
    const vals = s.moisture.filter((_, i) => !(s.sensorFault && s.sensorFault.index === i))
    return vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 1) : null
  }

  function emit(type, payload) {
    listeners.forEach((cb) => {
      try {
        cb({ type, payload })
      } catch (err) {
        console.error('[simulator] listener error', err)
      }
    })
  }

  function pushLog(list, entry, max = 300) {
    list.unshift(entry)
    if (list.length > max) list.length = max
  }

  /* ── alerts & SMS (GSM) ──────────────────────────────────────────────── */

  function sendSms(text) {
    if (!cfg.smsEnabled || !cfg.recipients.length) return
    cfg.recipients.forEach((to) => {
      // The GSM module works without internet, so SMS still goes out in fallback mode.
      const entry = { id: uid('sms'), ts: Date.now(), to, message: text.slice(0, 160), status: chance(0.94) ? 'Sent' : 'Failed', module: HARDWARE.gsmModule }
      pushLog(logs.sms, entry)
      emit('sms', entry)
    })
  }

  function notify(severity, type, title, message, { sms = severity !== 'info' } = {}) {
    const alert = { id: uid('al'), ts: Date.now(), severity, type, title, message, read: false }
    pushLog(logs.alerts, alert, 200)
    emit('alert', alert)
    if (sms) sendSms(`HydroSync ${severity.toUpperCase()}: ${title}. ${message}`)
  }

  /** Raise an alert once when a condition becomes true; re-arm when it clears (with cooldown). */
  function condition(key, active, build) {
    if (!active) {
      activeAlerts.delete(key)
      return
    }
    if (activeAlerts.has(key)) return
    activeAlerts.add(key)
    if (lastRaised[key] && Date.now() - lastRaised[key] < 90000) return
    lastRaised[key] = Date.now()
    const { severity, title, message, sms } = build()
    notify(severity, key, title, message, { sms })
  }

  function logCommand({ command, source, ok, detail, latencyMs, path }) {
    const entry = { id: uid('cmd'), ts: Date.now(), command, source, result: ok ? 'Success' : 'Failed', detail, latencyMs }
    pushLog(logs.commands, entry)
    emit('command', entry)
    if (latencyMs != null) {
      logs.latencies.push({ ts: entry.ts, ms: latencyMs, path, ok })
      if (logs.latencies.length > 200) logs.latencies.shift()
    }
    return entry
  }

  function pushEvent(e) {
    const ev = { id: uid('ev'), ...e }
    pushLog(logs.events, ev, 500)
    emit('event', ev)
  }

  /* ── actuators ───────────────────────────────────────────────────────── */

  function setValve(id, on, trigger = 'Auto') {
    if (s.valves[id] === on) return
    s.valves[id] = on
    const t = Date.now()
    if (id === 'irrigation') {
      if (on) s.irrigationRun = { start: t, trigger, usedAtStart: s.waterUsedTodayL }
      else if (s.irrigationRun) {
        const r = s.irrigationRun
        pushEvent({
          type: 'irrigation',
          start: r.start,
          durationSec: Math.max(1, Math.round((t - r.start) / 1000)),
          volumeL: round(s.waterUsedTodayL - r.usedAtStart, 1),
          trigger: r.trigger,
        })
        s.irrigationRun = null
      }
    } else if (on) {
      s.fertValveRun = { start: t, trigger, fertAtStart: s.fertTankLevel }
    } else if (s.fertValveRun) {
      const r = s.fertValveRun
      pushEvent({
        type: 'fertigation',
        start: r.start,
        durationSec: Math.max(1, Math.round((t - r.start) / 1000)),
        volumeL: round(((r.fertAtStart - s.fertTankLevel) / 100) * fertTankCapacityL, 2),
        trigger: r.trigger,
      })
      s.fertValveRun = null
    }
  }

  function beginFertigation(targetEc, trigger) {
    s.fertigation = { startedAt: Date.now(), startEc: round(s.ec, 2), targetEc, trigger, fertAtStart: s.fertTankLevel }
    s.valves.fertilizer = true
    s.fertValveRun = null // fertigation cycles log their own event
  }

  function finishFertigation(reason = 'complete') {
    const f = s.fertigation
    if (!f) return
    const t = Date.now()
    const done = reason === 'complete'
    const accuracy = done ? round(Math.max(0, 100 - (Math.abs(s.ec - f.targetEc) / f.targetEc) * 100), 1) : null
    pushEvent({
      type: 'fertigation',
      start: f.startedAt,
      durationSec: Math.max(1, Math.round((t - f.startedAt) / 1000)),
      volumeL: round(((f.fertAtStart - s.fertTankLevel) / 100) * fertTankCapacityL, 2),
      trigger: f.trigger,
      targetEc: f.targetEc,
      finalEc: round(s.ec, 2),
      accuracy,
      status: done ? 'Complete' : 'Stopped',
    })
    s.fertigation = null
    s.valves.fertilizer = false
    s.lastFertigationEnd = t
    if (done) {
      notify('info', 'fertigation', 'Fertigation complete', `EC reached ${s.ec.toFixed(2)} mS/cm (target ${f.targetEc.toFixed(2)}), accuracy ${accuracy}%.`)
    } else {
      notify('warning', 'fertigation', 'Fertigation stopped', reason, { sms: false })
    }
  }

  function logPreemption(avg, interrupted = false) {
    const th = cfg.thresholds
    const savedL = round(th.irrigationMin * irrigationFlowLpm, 1)
    const entry = {
      id: uid('rp'),
      ts: Date.now(),
      rainProbability: round(s.rainProbability, 0),
      threshold: th.rainThreshold,
      moistureAvg: avg,
      savedL,
      crop: cfg.cropName,
      note: interrupted ? 'Running cycle stopped early' : 'Scheduled cycle skipped',
    }
    pushLog(logs.preemptions, entry, 200)
    emit('preemption', entry)
    notify(
      'info',
      'rain_preemption',
      'Rain preemption triggered',
      `Irrigation skipped: ${entry.rainProbability}% rain probability ≥ ${th.rainThreshold}% threshold. ~${savedL} L saved.`,
      { sms: true },
    )
  }

  /* ── connectivity ────────────────────────────────────────────────────── */

  function startOutage(ms) {
    s.internetUp = false
    s.outageUntil = Date.now() + ms
    condition('connection', true, () => ({
      severity: 'critical',
      title: 'Connection lost',
      message: 'Internet/API unreachable. ESP32 switched to edge fallback logic and is logging to the SD card.',
    }))
  }

  function endOutage() {
    s.internetUp = true
    s.outageUntil = 0
    activeAlerts.delete('connection')
    const pending = s.sd.logged - s.sd.synced
    notify('info', 'connection', 'Connection restored', `Back online. Syncing ${pending} SD-card records to the cloud.`)
  }

  /* ── ESP32 automatic control (edge logic) ────────────────────────────── */

  function autoControl(avg, t) {
    const th = cfg.thresholds
    if (avg == null) return
    if (!s.preempted || avg >= th.moistureMin) s.preemptEpisode = false

    if (!s.valves.irrigation) {
      if (avg < th.moistureMin) {
        if (s.preempted) {
          if (!s.preemptEpisode) {
            s.preemptEpisode = true
            logPreemption(avg)
          }
        } else if (s.tankLevel > 3) {
          setValve('irrigation', true, 'Auto')
          logCommand({ command: 'AUTO · OPEN Irrigation Valve', source: 'ESP32 auto', ok: true, detail: `Avg moisture ${avg}% < ${th.moistureMin}%`, latencyMs: randInt(8, 25), path: 'edge' })
        }
      }
    } else if (s.irrigationRun) {
      const runMin = (t - s.irrigationRun.start) / 60000
      const closeAt = irrigationCloseAt(th)
      if (s.preempted) {
        setValve('irrigation', false)
        s.preemptEpisode = true
        logCommand({ command: 'AUTO · CLOSE Irrigation Valve', source: 'ESP32 auto', ok: true, detail: `Rain probability ${round(s.rainProbability, 0)}% ≥ ${th.rainThreshold}%`, latencyMs: randInt(8, 25), path: 'edge' })
        logPreemption(avg, true)
      } else if (avg >= closeAt || runMin >= th.irrigationMin || s.tankLevel <= 1) {
        setValve('irrigation', false)
        const why = avg >= closeAt ? `Avg moisture ${avg}% ≥ close point ${closeAt}%` : s.tankLevel <= 1 ? 'Water tank empty' : `Max run time ${th.irrigationMin} min reached`
        logCommand({ command: 'AUTO · CLOSE Irrigation Valve', source: 'ESP32 auto', ok: true, detail: why, latencyMs: randInt(8, 25), path: 'edge' })
      }
    }

    // Auto fertigation when EC drops below the stage minimum (with a cooldown).
    if (!s.fertigation && s.ec < th.ecMin && t - s.lastFertigationEnd > 60000 && s.fertTankLevel > 5) {
      const target = fertigationTarget(th)
      beginFertigation(target, 'Auto')
      logCommand({ command: `AUTO · START fertigation → ${target.toFixed(2)} mS/cm`, source: 'ESP32 auto', ok: true, detail: `EC ${s.ec.toFixed(2)} < ${th.ecMin}`, latencyMs: randInt(8, 25), path: 'edge' })
    }
  }

  /* ── main loop ───────────────────────────────────────────────────────── */

  function tick() {
    const t = Date.now()
    s.tick += 1
    s.ts = t
    const th = cfg.thresholds

    // 1. Weather: refreshed every 30 s while online; cached during edge fallback.
    if (s.tick % 15 === 0 && !edgeFallback()) {
      forecast = buildForecast(t)
      emit('weather', getWeather())
    }
    s.rainProbability = forecast.current.pop
    s.raining = forecast.hourly[0].pop >= 84
    s.preempted = s.rainProbability >= th.rainThreshold

    // 2. Connectivity: occasional internet outages in Cloud mode.
    if (cfg.connectionMode === 'cloud') {
      if (s.internetUp && chance(0.0015)) startOutage(rand(20000, 45000))
      else if (!s.internetUp && s.outageUntil && t >= s.outageUntil) endOutage()
    }

    // 3. Rare sensor faults (a zone probe returns garbage for ~20 s).
    if (!s.sensorFault && chance(0.0008)) {
      const index = randInt(0, 2)
      s.sensorFault = { index, since: t, until: t + 20000 }
      condition(`sensor_fault_${index}`, true, () => ({
        severity: 'critical',
        title: `Sensor fault · Zone ${index + 1}`,
        message: `Soil sensor ${index + 1} returned out-of-range readings. Excluded from the control average.`,
      }))
    } else if (s.sensorFault && t >= s.sensorFault.until) {
      activeAlerts.delete(`sensor_fault_${s.sensorFault.index}`)
      s.sensorFault = null
    }

    // 4. Control logic (runs on the ESP32, so it works with or without internet).
    const avg = avgMoisture()
    if (s.mode === 'auto') autoControl(avg, t)

    if (s.manualRun && t >= s.manualRun.endsAt) {
      const { valveId, durationMin } = s.manualRun
      s.manualRun = null
      setValve(valveId, false)
      logCommand({ command: `TIMER · CLOSE ${valveName(valveId)}`, source: 'ESP32 timer', ok: true, detail: `${durationMin} min manual run finished`, latencyMs: randInt(8, 25), path: 'edge' })
    }

    if (s.fertigation) {
      if (s.ec >= s.fertigation.targetEc - 0.01) finishFertigation('complete')
      else if (s.fertTankLevel < 1) finishFertigation('Tank F ran empty before reaching target EC.')
      else if (t - s.fertigation.startedAt > 5 * 60000) finishFertigation('Safety timeout (5 min) reached.')
    }

    // 5. Physics.
    const irrigating = s.valves.irrigation && s.tankLevel > 0.5
    const injecting = s.valves.fertilizer && s.fertTankLevel > 0.5
    const heat = 1 + (forecast.current.temp - 28) * 0.03
    s.moisture = s.moisture.map((m, i) => {
      let next = m - DRY_RATE[i] * heat
      if (irrigating) next += WET_RATE[i]
      if (s.raining) next += 0.12
      return clamp(next + jitter(0.12), 15, 95)
    })

    if (injecting) s.ec += rand(0.02, 0.035)
    else s.ec -= 0.0015
    if (irrigating && !injecting) s.ec -= 0.004
    s.ec = clamp(s.ec + jitter(0.008), 0.2, 4.5)

    if (irrigating) {
      const liters = irrigationFlowLpm * TICK_MIN
      s.waterUsedTodayL += liters
      s.tankLevel -= (liters / tankCapacityL) * 100
    }
    if (injecting) s.fertTankLevel -= ((fertFlowLpm * TICK_MIN) / fertTankCapacityL) * 100

    // 6. Refills (float valve on the main tank, farmer refills Tank F).
    if (!s.tankRefilling && s.tankLevel < 8) {
      s.tankRefilling = true
      notify('info', 'tank_refill', 'Water tank refilling', 'Float valve opened; main tank is refilling.')
    }
    if (s.tankRefilling) {
      s.tankLevel += 1.2
      if (s.tankLevel >= 95) s.tankRefilling = false
    }
    if (!s.fertRefilling && s.fertTankLevel < 4) {
      s.fertRefilling = true
      notify('info', 'fert_refill', 'Tank F refilled', 'Fertilizer stock tank refilled (simulated).')
    }
    if (s.fertRefilling) {
      s.fertTankLevel += 2
      if (s.fertTankLevel >= 100) s.fertRefilling = false
    }
    s.tankLevel = clamp(s.tankLevel, 0, 100)
    s.fertTankLevel = clamp(s.fertTankLevel, 0, 100)

    // 7. SD card logging + cloud sync.
    s.sd.logged += 1
    if (!edgeFallback()) {
      s.sd.synced = Math.min(s.sd.logged, s.sd.synced + 40)
      if (s.sd.synced === s.sd.logged) s.lastCloudSync = t
    } else {
      s.fallback.totalMs += TICK_MS
      if (chance(0.996)) s.fallback.upMs += TICK_MS
    }

    // 8. Alert rules.
    const a = cfg.alertThresholds
    condition('soil_dry', avg != null && avg < th.moistureMin - 3, () => ({
      severity: 'warning',
      title: 'Soil too dry',
      message: `Average soil moisture ${avg}% is below the ${cfg.cropName} minimum of ${th.moistureMin}%.`,
    }))
    condition('soil_wet', avg != null && avg > th.moistureMax + 3, () => ({
      severity: 'warning',
      title: 'Soil too wet',
      message: `Average soil moisture ${avg}% is above the ${cfg.cropName} maximum of ${th.moistureMax}%.`,
    }))
    condition('tds_low', s.ec < th.ecMin - 0.15 && !s.fertigation, () => ({
      severity: 'warning',
      title: 'TDS/EC below range',
      message: `EC ${s.ec.toFixed(2)} mS/cm is below the target ${th.ecMin}–${th.ecMax} mS/cm.`,
    }))
    condition('tds_high', s.ec > th.ecMax + 0.15, () => ({
      severity: 'warning',
      title: 'TDS/EC above range',
      message: `EC ${s.ec.toFixed(2)} mS/cm is above the target ${th.ecMin}–${th.ecMax} mS/cm. Consider flushing with clean water.`,
    }))
    condition('tank_low', s.tankLevel < a.lowTank, () => ({
      severity: s.tankLevel < 10 ? 'critical' : 'warning',
      title: 'Water tank low',
      message: `Water tank at ${Math.round(s.tankLevel)}% (alert below ${a.lowTank}%). Refill soon.`,
    }))
    condition('fert_low', s.fertTankLevel < a.lowFert, () => ({
      severity: 'warning',
      title: 'Fertilizer Tank F low',
      message: `Tank F at ${Math.round(s.fertTankLevel)}% (alert below ${a.lowFert}%).`,
    }))

    // 9. Keep a 30-minute, 10-second-resolution trend for the Overview chart.
    const snap = getSnapshot()
    const last = trend[trend.length - 1]
    if (!last || t - last.ts >= TREND_STEP_MS) {
      trend.push(toPoint(snap))
      trend = trend.filter((p) => p.ts >= t - TREND_WINDOW_MS)
    }

    emit('telemetry', snap)
  }

  /* ── read models ─────────────────────────────────────────────────────── */

  function getSnapshot() {
    const fault = s.sensorFault
    const moisture = s.moisture.map((m, i) => (fault && fault.index === i ? null : round(m, 1)))
    const sensors = [
      ...[0, 1, 2].map((i) => ({
        id: `soil${i + 1}`,
        value: moisture[i],
        unit: '%',
        lastReadingTs: fault && fault.index === i ? fault.since : s.ts,
        status: fault && fault.index === i ? 'fault' : 'ok',
      })),
      { id: 'tds', value: round(s.ec, 2), unit: 'mS/cm', lastReadingTs: s.ts, status: 'ok' },
      { id: 'tank', value: round(s.tankLevel, 1), unit: '%', lastReadingTs: s.ts, status: 'ok' },
      { id: 'fertTank', value: round(s.fertTankLevel, 1), unit: '%', lastReadingTs: s.ts, status: 'ok' },
    ]
    return {
      ts: s.ts,
      moisture,
      moistureAvg: avgMoisture(),
      ec: round(s.ec, 2),
      tankLevel: round(s.tankLevel, 1),
      fertTankLevel: round(s.fertTankLevel, 1),
      valves: { ...s.valves },
      mode: s.mode,
      manualRun: s.manualRun ? { ...s.manualRun } : null,
      fertigation: s.fertigation ? { ...s.fertigation } : null,
      rain: {
        probability: round(s.rainProbability, 0),
        threshold: cfg.thresholds.rainThreshold,
        preempted: s.preempted,
        raining: s.raining,
      },
      connection: {
        mode: cfg.connectionMode,
        internetUp: s.internetUp,
        apiReachable: cfg.connectionMode === 'cloud' && s.internetUp,
        edgeFallback: edgeFallback(),
        outageUntil: s.outageUntil || null,
        esp32Ip: cfg.esp32Ip,
        rssi: Math.round(-56 + jitter(6)),
        lastCloudSync: s.lastCloudSync,
        weatherFetchedAt: forecast.fetchedAt,
      },
      sd: {
        mounted: true,
        capacityGb: HARDWARE.sdCapacityGb,
        usedPct: round(3.2 + s.sd.logged * 0.00004, 1),
        logged: s.sd.logged,
        synced: s.sd.synced,
      },
      sensors,
      refilling: { tank: s.tankRefilling, fert: s.fertRefilling },
      waterUsedTodayL: round(s.waterUsedTodayL, 1),
      uptimeSec: Math.round((s.ts - boot) / 1000) + 3 * 3600,
      firmware: HARDWARE.firmware,
    }
  }

  function getWeather() {
    return { ...forecast, hourly: forecast.hourly.map((h) => ({ ...h })), stale: edgeFallback() }
  }

  /* ── commands (async, with simulated network latency) ────────────────── */

  const latencyFor = () => (cfg.connectionMode === 'local' ? randInt(35, 120) : randInt(180, 480))

  async function runCommand(command, apply) {
    const latencyMs = latencyFor()
    await delay(latencyMs)
    let ok = true
    let detail = 'Acknowledged by ESP32'
    if (failMode) {
      ok = false
      detail = 'Simulated API failure (HTTP 503)'
    } else if (edgeFallback()) {
      ok = false
      detail = 'Unreachable: ESP32 is running offline edge fallback. Use Local hotspot mode for manual control.'
    } else if (chance(0.03)) {
      ok = false
      detail = 'Timeout: no ACK from ESP32'
    } else {
      const res = apply()
      if (res?.error) {
        ok = false
        detail = res.error
      } else if (res?.detail) detail = res.detail
    }
    const entry = logCommand({ command, source: 'Dashboard', ok, detail, latencyMs, path: commandPath() })
    emit('telemetry', getSnapshot())
    if (!ok) throw new CommandError(detail, entry)
    return entry
  }

  function sendValveCommand(valveId, on, { durationMin } = {}) {
    const label = `${on ? 'OPEN' : 'CLOSE'} ${valveName(valveId)}${on && durationMin ? ` · ${durationMin} min` : ''}`
    return runCommand(label, () => {
      if (s.mode === 'auto') return { error: 'Rejected: device is in Automatic mode' }
      if (valveId === 'fertilizer' && s.fertigation && !on) {
        finishFertigation('Stopped by user.')
        return { detail: 'Fertigation cycle stopped' }
      }
      setValve(valveId, on, 'Manual')
      if (on && durationMin) {
        const now = Date.now()
        s.manualRun = { valveId, durationMin, startedAt: now, endsAt: now + durationMin * 60000 }
      } else if (!on && s.manualRun?.valveId === valveId) {
        s.manualRun = null
      }
      return { detail: on ? 'Valve opened' : 'Valve closed' }
    })
  }

  function setControlMode(mode) {
    return runCommand(`SET MODE → ${mode === 'auto' ? 'Automatic' : 'Manual'}`, () => {
      s.mode = mode
      if (mode === 'auto') {
        // Hand control back to the rules: close manually-opened valves.
        s.manualRun = null
        setValve('irrigation', false)
        if (!s.fertigation) setValve('fertilizer', false)
      }
      return { detail: mode === 'auto' ? 'Automatic rules active' : 'Manual control enabled' }
    })
  }

  function startFertigation(targetEc) {
    return runCommand(`START fertigation → ${targetEc.toFixed(2)} mS/cm`, () => {
      if (s.fertigation) return { error: 'A fertigation cycle is already running' }
      if (s.fertTankLevel < 3) return { error: 'Tank F is empty' }
      if (s.ec >= targetEc) return { error: `EC already ${s.ec.toFixed(2)} mS/cm ≥ target` }
      setValve('fertilizer', false)
      beginFertigation(targetEc, 'Manual')
      return { detail: 'Cycle started' }
    })
  }

  function stopFertigation() {
    return runCommand('STOP fertigation', () => {
      if (!s.fertigation) return { error: 'No fertigation cycle running' }
      finishFertigation('Stopped by user.')
      return { detail: 'Cycle stopped' }
    })
  }

  /* ── config from the dashboard ───────────────────────────────────────── */

  function configure(patch) {
    const prevMode = cfg.connectionMode
    cfg = { ...cfg, ...patch, thresholds: { ...cfg.thresholds, ...(patch.thresholds || {}) } }
    if (patch.connectionMode && patch.connectionMode !== prevMode) {
      if (patch.connectionMode === 'offline') {
        s.internetUp = false
        s.outageUntil = 0
      } else if (!s.internetUp) {
        s.internetUp = true
        s.outageUntil = 0
        activeAlerts.delete('connection')
      }
      if (configured) {
        const label = { cloud: 'Cloud mode', local: 'Local hotspot mode', offline: 'Offline fallback mode' }[patch.connectionMode]
        notify(patch.connectionMode === 'offline' ? 'warning' : 'info', 'connection', `${label} enabled`, patch.connectionMode === 'offline' ? 'ESP32 continues autonomous edge control, logging to SD card.' : 'Dashboard connection mode changed.', { sms: false })
      }
    }
    configured = true
    if (patch.thresholds) s.preempted = s.rainProbability >= cfg.thresholds.rainThreshold
    emit('telemetry', getSnapshot())
  }

  // The "device" is always running once the module loads.
  forecast = buildForecast(boot)
  s.rainProbability = forecast.current.pop
  setInterval(tick, TICK_MS)

  return {
    getSnapshot,
    getWeather,
    getTrend: () => trend.map((p) => ({ ...p })),
    getAlerts: () => logs.alerts.map((x) => ({ ...x })),
    getSms: () => logs.sms.map((x) => ({ ...x })),
    getCommands: () => logs.commands.map((x) => ({ ...x })),
    getPreemptions: () => logs.preemptions.map((x) => ({ ...x })),
    getPerformanceInputs: () => ({
      latencies: [...logs.latencies],
      events: [...logs.events],
      preemptions: [...logs.preemptions],
      fallback: { ...s.fallback },
    }),
    getLiveEvents: () => [...logs.events],
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    configure,
    sendValveCommand,
    setControlMode,
    startFertigation,
    stopFertigation,
    acknowledgeAlert(id) {
      const a = logs.alerts.find((x) => x.id === id)
      if (a) a.read = true
    },
    acknowledgeAll() {
      logs.alerts.forEach((a) => (a.read = true))
    },
    simulateOutage(ms = 30000) {
      if (cfg.connectionMode !== 'cloud' || !s.internetUp) return false
      startOutage(ms)
      emit('telemetry', getSnapshot())
      return true
    },
    setFailMode(v) {
      failMode = v
    },
    assertHealthy() {
      if (failMode) throw new Error('Simulated API failure: HydroSync API returned HTTP 503.')
    },
  }
}

export const toPoint = (t) => ({
  ts: t.ts,
  m1: t.moisture[0],
  m2: t.moisture[1],
  m3: t.moisture[2],
  avg: t.moistureAvg,
  ec: t.ec,
  tank: t.tankLevel,
  fert: t.fertTankLevel,
})

export const simulator = createSimulator()
