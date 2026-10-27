/** Default user settings. Persisted to localStorage by the settings store. */
export const DEFAULT_SETTINGS = {
  // Device / backend
  esp32Ip: '192.168.4.1', // ESP32 SoftAP default gateway
  apiBaseUrl: 'https://api.hydrosync.example/api/v1', // placeholder for the future Laravel API
  owmApiKey: '', // OpenWeatherMap API key placeholder (used by the backend / ESP32 later)
  connectionMode: 'cloud', // 'cloud' | 'local' | 'offline'

  // Display
  tempUnit: 'C', // 'C' | 'F'
  volumeUnit: 'L', // 'L' | 'gal'
  nutrientUnit: 'ec', // primary nutrient display: 'ec' (mS/cm) | 'ppm' (TDS)
  ecFactor: 0.5, // EC → ppm conversion factor (0.5 = "500 scale", 0.7 = "700 scale")
  theme: 'system', // 'light' | 'dark' | 'system'
  language: 'en', // placeholder: 'en' | 'fil'
  animations: true,

  // Alerts & SMS (GSM)
  alertThresholds: {
    lowTank: 20, // %
    lowFert: 15, // %
  },
  smsEnabled: true,
  recipients: ['+63 917 123 4567'],
}
