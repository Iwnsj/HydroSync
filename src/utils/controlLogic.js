/**
 * Control rules shared by the simulator (a stand-in for the ESP32 firmware)
 * and the Device Control page, so the UI always describes the exact logic
 * the "device" runs.
 */

/** Irrigation closes once the average moisture recovers to 75% of the target band. */
export const irrigationCloseAt = (t) => Math.round(t.moistureMin + (t.moistureMax - t.moistureMin) * 0.75)

/** Fertigation doses up to the middle of the stage's EC band. */
export const fertigationTarget = (t) => Math.round(((t.ecMin + t.ecMax) / 2) * 100) / 100

/** Rain preemption: skip irrigation when forecast probability ≥ threshold. */
export const isRainPreempted = (rainProbability, threshold) =>
  rainProbability != null && rainProbability >= threshold
