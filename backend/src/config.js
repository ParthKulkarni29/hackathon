require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  RATE_PER_KM_INR: parseFloat(process.env.RATE_PER_KM_INR || '14.0'),
  RATE_PER_KM_PAISE: parseInt(process.env.RATE_PER_KM_PAISE || '1400', 10),
  MAX_ALLOWED_DETOUR_PCT: parseFloat(process.env.MAX_ALLOWED_DETOUR_PCT || '15.0'),
  DEFAULT_SPEED_KMH: parseFloat(process.env.DEFAULT_SPEED_KMH || '60.0'),
  CO2_EMISSION_FACTOR_KG_PER_KM: parseFloat(process.env.CO2_EMISSION_FACTOR_KG_PER_KM || '0.19'),
  MAX_VEHICLE_CAPACITY: parseInt(process.env.MAX_VEHICLE_CAPACITY || '4', 10),
  OSRM_BASE_URL: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  OSRM_TIMEOUT_MS: parseInt(process.env.OSRM_TIMEOUT_MS || '3000', 10),
  BATCH_WINDOW_SECONDS: parseInt(process.env.BATCH_WINDOW_SECONDS || '30', 10)
};
