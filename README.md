# HydroSync — IoT Drip Irrigation & Fertigation Dashboard

Frontend-only React 18 + Vite dashboard for **HydroSync**, an ESP32-based drip irrigation and fertigation controller with OpenWeatherMap rain preemption, SD-card offline logging, and SIM800L GSM SMS alerts.

Right now the app runs entirely in the browser on top of a realistic 2-second physics + firmware simulator (`src/services/mock/`). Every UI component talks exclusively to `src/services/telemetryService.js`, so switching to the real **Laravel API** (Cloud mode) or the **ESP32 local web server** (`192.168.4.1` SoftAP mode) is a one-line change.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (also exposed on LAN for phone testing)
npm run dev

# 3. Production build check
npm run build
npm run preview
```

---

## Project Structure

```text
HydroSync DRAFT/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── config/
    │   ├── motion.js          # Shared animation timings & easing curves
    │   ├── device.js          # ESP32 GPIO pins, valve & sensor hardware metadata
    │   ├── defaults.js        # Default persisted user settings
    │   ├── navigation.js      # Sidebar & mobile bottom-nav routes
    │   └── chartColors.js     # Recharts color palette
    ├── data/
    │   └── crops.js           # 10 crop profiles + 4 growth stages + Custom crop factory
    ├── services/
    │   ├── apiClient.js       # ★ USE_MOCK toggle + Cloud (Laravel) & Local (ESP32) URL resolver
    │   ├── telemetryService.js# Public API consumed by stores & pages
    │   └── mock/
    │       ├── simulator.js   # 2-second physics + ESP32 autonomous rule simulator
    │       ├── history.js     # Deterministic 28-day history & thesis metrics generator
    │       ├── seed.js        # Initial alerts, SMS logs, commands & 30-min trend
    │       └── random.js      # Math/noise helpers
    ├── store/
    │   ├── settingsStore.js   # Zustand store persisted to localStorage ("hydrosync-settings")
    │   ├── telemetryStore.js  # In-memory live telemetry, buffers, alerts, SMS & commands
    │   └── toastStore.js      # Toast notifications
    ├── hooks/
    │   ├── useActiveProfile.js
    │   ├── useAsync.js
    │   ├── useChartAnimation.js
    │   ├── useMotionEnabled.js
    │   ├── useNow.js
    │   ├── useTelemetry.js
    │   ├── useTheme.js
    │   └── useUnits.js
    ├── utils/
    │   ├── controlLogic.js
    │   ├── cropUtils.js
    │   ├── csv.js
    │   ├── format.js
    │   └── status.js
    ├── components/
    │   ├── charts/
    │   │   ├── chartTheme.jsx
    │   │   └── TimeSeriesChart.jsx
    │   ├── dashboard/
    │   │   ├── HeroCard.jsx
    │   │   └── RainPreemptionCard.jsx
    │   ├── layout/
    │   │   ├── AppLayout.jsx
    │   │   ├── BottomNav.jsx
    │   │   ├── FallbackBanner.jsx
    │   │   ├── Header.jsx
    │   │   ├── Logo.jsx
    │   │   └── Sidebar.jsx
    │   ├── motion/
    │   │   └── Stagger.jsx
    │   └── ui/
    │       ├── AlertItem.jsx
    │       ├── AnimatedNumber.jsx
    │       ├── Badge.jsx
    │       ├── ChartCard.jsx
    │       ├── ConfirmDialog.jsx
    │       ├── CropCard.jsx
    │       ├── Gauge.jsx
    │       ├── PageHeader.jsx
    │       ├── ProgressBar.jsx
    │       ├── SegmentedControl.jsx
    │       ├── Skeleton.jsx
    │       ├── StatCard.jsx
    │       ├── States.jsx
    │       ├── Toaster.jsx
    │       ├── Toggle.jsx
    │       └── ValveCard.jsx
    └── pages/
        ├── Overview.jsx
        ├── LiveMonitoring.jsx
        ├── DeviceControl.jsx
        ├── CropProfiles.jsx
        ├── Weather.jsx
        ├── Alerts.jsx
        ├── History.jsx
        ├── Performance.jsx
        ├── Connectivity.jsx
        ├── Settings.jsx
        └── NotFound.jsx
```

---

## Swapping the Mock Service for the Real Laravel API or ESP32

### 1. Flip the switch in `src/services/apiClient.js`

Open `src/services/apiClient.js` and change line 7:

```js
// Before (mock simulator in browser):
export const USE_MOCK = true

// After (live HTTP + WebSocket calls):
export const USE_MOCK = false
```

### 2. How Cloud Mode vs. Local ESP32 Hotspot Mode works

`src/services/apiClient.js` automatically routes requests based on the user's selected connection mode (`settings.connectionMode`):

| Service Function | Cloud Mode (Laravel API) | Local Hotspot Mode (`http://192.168.4.1`) |
| --- | --- | --- |
| `getLiveTelemetry()` | `GET {API}/telemetry/latest` | `GET http://192.168.4.1/api/telemetry` |
| `subscribe(cb)` | WebSocket `wss://{host}/app/{reverbKey}` | 2 s poll `GET /api/telemetry` (or `ws://192.168.4.1/ws`) |
| `sendValveCommand(id, state, opts)` | `POST {API}/devices/{device}/valves/{valve}` | `POST http://192.168.4.1/api/valve/{valve}` |
| `setControlMode(mode)` | `PUT {API}/devices/{device}/mode` | `PUT http://192.168.4.1/api/mode` |
| `startFertigation(targetEc)` | `POST {API}/devices/{device}/fertigation` | `POST http://192.168.4.1/api/fertigation` |
| `getHistory(range)` | `GET {API}/telemetry/history?from=&to=&bucket_ms=` | `GET http://192.168.4.1/api/history?from=&to=` |
| `getEvents(range)` | `GET {API}/irrigation-events?from=&to=` | `GET http://192.168.4.1/api/events?from=&to=` |
| `getAlerts()` | `GET {API}/alerts` | `GET http://192.168.4.1/api/alerts` |
| `getWeather()` | `GET {API}/weather/forecast` | `GET http://192.168.4.1/api/weather-cache` |
| `getPerformance()` | `GET {API}/metrics/performance` | `GET http://192.168.4.1/api/metrics` |
| `syncDeviceConfig(cfg)` | `PUT {API}/devices/{device}/config` | `PUT http://192.168.4.1/api/config` |

### 3. Expected JSON Payload for `getLiveTelemetry()`

```json
{
  "ts": 1730000000000,
  "moisture": [58.4, 62.1, 55.7],
  "moistureAvg": 58.7,
  "ec": 1.86,
  "tankLevel": 68.0,
  "fertTankLevel": 57.0,
  "valves": { "irrigation": false, "fertilizer": false },
  "mode": "auto",
  "manualRun": null,
  "fertigation": null,
  "rain": { "probability": 35, "threshold": 80, "preempted": false, "raining": false },
  "connection": {
    "mode": "cloud",
    "internetUp": true,
    "apiReachable": true,
    "edgeFallback": false,
    "outageUntil": null,
    "esp32Ip": "192.168.4.1",
    "rssi": -56,
    "lastCloudSync": 1730000000000,
    "weatherFetchedAt": 1730000000000
  },
  "sd": { "mounted": true, "capacityGb": 16, "usedPct": 3.9, "logged": 18240, "synced": 18240 },
  "sensors": [
    { "id": "soil1", "value": 58.4, "unit": "%", "lastReadingTs": 1730000000000, "status": "ok" },
    { "id": "soil2", "value": 62.1, "unit": "%", "lastReadingTs": 1730000000000, "status": "ok" },
    { "id": "soil3", "value": 55.7, "unit": "%", "lastReadingTs": 1730000000000, "status": "ok" },
    { "id": "tds", "value": 1.86, "unit": "mS/cm", "lastReadingTs": 1730000000000, "status": "ok" },
    { "id": "tank", "value": 68.0, "unit": "%", "lastReadingTs": 1730000000000, "status": "ok" },
    { "id": "fertTank", "value": 57.0, "unit": "%", "lastReadingTs": 1730000000000, "status": "ok" }
  ],
  "refilling": { "tank": false, "fert": false },
  "waterUsedTodayL": 142.6,
  "uptimeSec": 10800,
  "firmware": "v0.9.3-thesis"
}
```

### 4. Authentication & CORS Notes

- **Laravel Sanctum**: Uncomment the `Authorization: Bearer ...` header in `src/services/apiClient.js` (`http()`) once login tokens are issued.
- **ESP32 Local Hotspot**: Ensure the `ESPAsyncWebServer` firmware adds `Access-Control-Allow-Origin: *` (and `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS`) so a phone browser can call `http://192.168.4.1/api/*` directly.
