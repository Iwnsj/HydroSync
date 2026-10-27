import { Cloud, Router, WifiOff } from 'lucide-react'

/** Hardware metadata for the HydroSync ESP32 build. UI-only, no live values. */

export const HARDWARE = {
  mcu: 'ESP32-WROOM-32',
  firmware: 'v0.9.3-thesis',
  gsmModule: 'SIM800L GSM',
  irrigationFlowLpm: 12, // drip line flow while the irrigation valve is open
  tankCapacityL: 200, // main water tank
  fertFlowLpm: 0.5, // Tank F injection rate
  fertTankCapacityL: 20, // fertilizer stock tank ("Tank F")
  sdCapacityGb: 16,
}

export const VALVES = [
  {
    id: 'irrigation',
    name: 'Irrigation Valve',
    short: 'Irrigation',
    description: '12V solenoid · main drip line',
    relay: 'Relay CH1 · GPIO 26',
  },
  {
    id: 'fertilizer',
    name: 'Fertilizer Valve',
    short: 'Fertilizer',
    description: '12V solenoid · Tank F injection',
    relay: 'Relay CH2 · GPIO 27',
  },
]

export const ZONES = ['Zone 1', 'Zone 2', 'Zone 3']

export const SENSORS = [
  { id: 'soil1', name: 'Soil moisture · Zone 1', model: 'Capacitive v1.2', pin: 'GPIO 34' },
  { id: 'soil2', name: 'Soil moisture · Zone 2', model: 'Capacitive v1.2', pin: 'GPIO 35' },
  { id: 'soil3', name: 'Soil moisture · Zone 3', model: 'Capacitive v1.2', pin: 'GPIO 32' },
  { id: 'tds', name: 'TDS / EC probe', model: 'Analog TDS meter', pin: 'GPIO 33' },
  { id: 'tank', name: 'Water tank level', model: 'JSN-SR04T ultrasonic', pin: 'GPIO 5 / 18' },
  { id: 'fertTank', name: 'Tank F level', model: 'JSN-SR04T ultrasonic', pin: 'GPIO 19 / 21' },
]

export const CONNECTION_MODES = [
  {
    id: 'cloud',
    label: 'Cloud',
    icon: Cloud,
    description: 'Dashboard ↔ Laravel API over the internet. ESP32 uploads telemetry and receives commands from the cloud.',
  },
  {
    id: 'local',
    label: 'Local hotspot',
    icon: Router,
    description: "Phone joins the ESP32's own Wi-Fi hotspot and talks to the device directly by IP. No internet needed.",
  },
  {
    id: 'offline',
    label: 'Offline fallback',
    icon: WifiOff,
    description: 'No internet or API. ESP32 runs edge fallback logic on its own, logs to SD card and sends SMS via GSM.',
  },
]
