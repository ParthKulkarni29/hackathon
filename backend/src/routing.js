const { OSRM_BASE_URL, OSRM_TIMEOUT_MS, DEFAULT_SPEED_KMH } = require('./config');
const { haversineDistance } = require('./topology');

// In-memory cache for OSRM routes
const routeCache = new Map();
const MAX_CACHE_SIZE = 500;

/**
 * Generate a deterministic cache key for a route request
 */
function makeCacheKey(coords) {
  return coords.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join(';');
}

/**
 * Fallback route generation using Haversine distance and milestone interpolation
 */
function generateFallbackRoute(coords) {
  let totalDistKm = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    // Road curvature multiplier for Haversine ~ 1.18x along expressway terrain
    const segDist = haversineDistance(lat1, lon1, lat2, lon2) * 1.15;
    totalDistKm += segDist;
  }

  const durationMin = (totalDistKm / DEFAULT_SPEED_KMH) * 60;

  // Generate intermediate interpolated points for smooth polyline on map
  const polyline = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const start = coords[i];
    const end = coords[i + 1];
    polyline.push(start);
    // Interpolate 5 intermediate points per segment
    const steps = 5;
    for (let s = 1; s < steps; s++) {
      const frac = s / steps;
      polyline.push([
        start[0] + (end[0] - start[0]) * frac,
        start[1] + (end[1] - start[1]) * frac
      ]);
    }
  }
  if (coords.length > 0) {
    polyline.push(coords[coords.length - 1]);
  }

  return {
    distance_km: Math.round(totalDistKm * 10) / 10,
    duration_min: Math.round(durationMin * 10) / 10,
    polyline,
    provider: 'HAVERSINE_FALLBACK'
  };
}

/**
 * Decode OSRM / Google polyline format
 */
function decodePolyline(str, precision = 5) {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  let factor = Math.pow(10, precision);

  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

/**
 * Fetch route between ordered coordinates with timeout, cache, and fallback
 * @param {Array<[number, number]>} coords Array of [lat, lng]
 */
async function getRoute(coords) {
  if (!coords || coords.length < 2) {
    return {
      distance_km: 0,
      duration_min: 0,
      polyline: coords || [],
      provider: 'DIRECT'
    };
  }

  const cacheKey = makeCacheKey(coords);
  if (routeCache.has(cacheKey)) {
    return { ...routeCache.get(cacheKey), cached: true };
  }

  // OSRM expects {lng},{lat};{lng},{lat}
  const coordString = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // geojson coordinates are [lng, lat] -> convert to [lat, lng]
        const polyline = (route.geometry.coordinates || []).map(([lng, lat]) => [lat, lng]);
        const result = {
          distance_km: Math.round((route.distance / 1000) * 10) / 10,
          duration_min: Math.round((route.duration / 60) * 10) / 10,
          polyline: polyline.length ? polyline : coords,
          provider: 'OSRM'
        };

        if (routeCache.size >= MAX_CACHE_SIZE) {
          const firstKey = routeCache.keys().next().value;
          routeCache.delete(firstKey);
        }
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    // Network error, OSRM timeout, or abort
    clearTimeout(timeoutId);
    console.warn(`[OSRM Warning] ${err.name === 'AbortError' ? 'Timeout' : err.message}, using Haversine fallback.`);
  }

  // Fallback
  const fallback = generateFallbackRoute(coords);
  routeCache.set(cacheKey, fallback);
  return fallback;
}

module.exports = {
  getRoute,
  generateFallbackRoute
};
