import { io } from 'socket.io-client';

const API_BASE = '/api';

export const socket = io('/', {
  autoConnect: true,
  reconnection: true
});

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}: ${res.statusText}`);
  }
  return data;
}

export const api = {
  getHealth: () => request('/health'),
  getCorridorNodes: () => request('/corridor-nodes'),
  getRides: (params = '') => request(`/rides${params ? '?' + new URLSearchParams(params) : ''}`),
  getRide: (id) => request(`/rides/${id}`),
  createRide: (data) => request('/rides', { method: 'POST', body: JSON.stringify(data) }),
  cancelRide: (id, reason) => request(`/rides/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  soloFallback: (id) => request(`/rides/${id}/solo-fallback`, { method: 'POST' }),
  getQuote: (pickup, dropoff) => request('/quote', { method: 'POST', body: JSON.stringify({ pickup, dropoff }) }),
  getDrivers: () => request('/drivers'),
  updateDriverStatus: (id, status, current_location) =>
    request(`/drivers/${id}/status`, { method: 'POST', body: JSON.stringify({ status, current_location }) }),
  getTrips: () => request('/trips'),
  getTrip: (id) => request(`/trips/${id}`),
  updateTripStatus: (id, data) => request(`/trips/${id}/status`, { method: 'POST', body: JSON.stringify(data) }),
  acceptTrip: (id, driver_id) => request(`/trips/${id}/accept`, { method: 'POST', body: JSON.stringify({ driver_id }) }),
  rejectTrip: (id, driver_id, reason) => request(`/trips/${id}/reject`, { method: 'POST', body: JSON.stringify({ driver_id, reason }) }),
  arrivedAtStop: (id, stop_index) => request(`/trips/${id}/arrived`, { method: 'POST', body: JSON.stringify({ stop_index }) }),
  verifyPickupOtp: (id, stop_index, otp) => request(`/trips/${id}/verify-otp`, { method: 'POST', body: JSON.stringify({ stop_index, otp }) }),
  dropoffPassenger: (id, stop_index) => request(`/trips/${id}/dropoff`, { method: 'POST', body: JSON.stringify({ stop_index }) }),
  completeTrip: (id) => request(`/trips/${id}/complete`, { method: 'POST' }),
  runDispatch: () => request('/dispatch/run', { method: 'POST' }),
  getDispatchStatus: () => request('/dispatch/status'),
  getRejectedMatches: () => request('/dispatch/rejected'),
  getAnalytics: () => request('/analytics'),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),
  runGoldenCorridorDemo: () => request('/demo/golden-corridor', { method: 'POST' }),
  getGoldenCorridorInfo: () => request('/demo/golden-corridor'),
  runRejectionDemo: () => request('/demo/rejection', { method: 'POST' }),
  runBenchmarkDemo: () => request('/demo/benchmark', { method: 'POST' })
};
