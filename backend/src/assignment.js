/**
 * Atomic Driver & Vehicle Assignment Module
 */

/**
 * Assign an available driver to a dispatched trip
 * @param {object} trip 
 * @param {Array<object> | object} storeOrDrivers 
 * @returns {{ driver: object | null, success: boolean, reason?: string }}
 */
function assignDriverToTrip(trip, storeOrDrivers) {
  const isStore = storeOrDrivers && typeof storeOrDrivers.getDrivers === 'function';
  const drivers = isStore ? storeOrDrivers.getDrivers() : storeOrDrivers;

  // Find drivers that are strictly AVAILABLE
  const availableDrivers = drivers.filter(d => d.status === 'AVAILABLE');

  if (availableDrivers.length === 0) {
    return {
      driver: null,
      success: false,
      reason: 'No drivers currently available with AVAILABLE status'
    };
  }

  // Match driver with suitable capacity and nearest to starting stop
  const startStop = trip.stops && trip.stops.length > 0 ? trip.stops[0] : null;
  const tripCapacityRequired = trip.peak_occupancy || 1;

  let bestDriver = null;
  let minDistance = Infinity;

  for (const driver of availableDrivers) {
    if ((driver.capacity || 4) >= tripCapacityRequired) {
      if (startStop && driver.current_location) {
        const dLat = (driver.current_location.lat || 18.6508) - startStop.lat;
        const dLng = (driver.current_location.lng || 73.7438) - startStop.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < minDistance) {
          minDistance = dist;
          bestDriver = driver;
        }
      } else {
        bestDriver = driver;
        break;
      }
    }
  }

  if (!bestDriver) {
    bestDriver = availableDrivers[0];
  }

  // Atomic state change
  bestDriver.status = 'ASSIGNED';
  bestDriver.current_trip_id = trip.id;
  bestDriver.updated_at = new Date().toISOString();

  if (isStore) {
    storeOrDrivers.updateDriver(bestDriver.id, {
      status: 'ASSIGNED',
      current_trip_id: trip.id
    });
  }

  return {
    driver: bestDriver,
    success: true
  };
}

/**
 * Assign a specific requested driver to a trip, strictly verifying availability
 */
function assignSpecificDriverToTrip(trip, driverId, storeOrDrivers) {
  const isStore = storeOrDrivers && typeof storeOrDrivers.getDrivers === 'function';
  const drivers = isStore ? storeOrDrivers.getDrivers() : storeOrDrivers;

  const driver = drivers.find(d => d.id === driverId);
  if (!driver) {
    return { driver: null, success: false, reason: `Driver '${driverId}' not found` };
  }

  if (driver.status !== 'AVAILABLE') {
    return {
      driver: null,
      success: false,
      reason: `Driver '${driver.name}' (${driver.id}) is currently ${driver.status} and cannot be assigned to another trip concurrently.`
    };
  }

  driver.status = 'ASSIGNED';
  driver.current_trip_id = trip.id;
  driver.updated_at = new Date().toISOString();

  if (isStore) {
    storeOrDrivers.updateDriver(driver.id, {
      status: 'ASSIGNED',
      current_trip_id: trip.id
    });
  }

  return {
    driver,
    success: true
  };
}

module.exports = {
  assignDriverToTrip,
  assignSpecificDriverToTrip
};
