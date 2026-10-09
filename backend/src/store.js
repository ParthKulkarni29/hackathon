const fs = require('fs');
const path = require('path');
const { calculateSoloFare } = require('./pricing');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function getInitialSeedData() {
  const soloRahul = calculateSoloFare('Pune (Kiwale)', 'Lonavala');
  const soloPriya = calculateSoloFare('Talegaon', 'Panvel');
  const soloAman = calculateSoloFare('Lonavala', 'Mumbai');

  return {
    rides: [
      {
        id: 'ride_rahul',
        rider_id: 'Rahul',
        passenger_name: 'Rahul Sharma',
        pickup: 'Pune (Kiwale)',
        dropoff: 'Lonavala',
        seats: 1,
        status: 'PENDING',
        created_at: new Date(Date.now() - 120000).toISOString(),
        direct_distance_km: soloRahul.distance_km,
        solo_fare_paise: soloRahul.fare_paise,
        locked_quote_paise: 50400, // Locked estimate: ₹504.00
        trip_id: null,
        detour_pct: 0,
        pickup_otp: '4829'
      },
      {
        id: 'ride_priya',
        rider_id: 'Priya',
        passenger_name: 'Priya Nair',
        pickup: 'Talegaon',
        dropoff: 'Panvel',
        seats: 1,
        status: 'PENDING',
        created_at: new Date(Date.now() - 90000).toISOString(),
        direct_distance_km: soloPriya.distance_km,
        solo_fare_paise: soloPriya.fare_paise,
        locked_quote_paise: 72800, // Locked estimate: ₹728.00
        trip_id: null,
        detour_pct: 0,
        pickup_otp: '7194'
      },
      {
        id: 'ride_aman',
        rider_id: 'Aman',
        passenger_name: 'Aman Khan',
        pickup: 'Lonavala',
        dropoff: 'Mumbai',
        seats: 1,
        status: 'PENDING',
        created_at: new Date(Date.now() - 40000).toISOString(),
        direct_distance_km: soloAman.distance_km,
        solo_fare_paise: soloAman.fare_paise,
        locked_quote_paise: 86800, // Locked estimate: ₹868.00
        trip_id: null,
        detour_pct: 0,
        pickup_otp: '5382'
      }
    ],
    drivers: [
      {
        id: 'drv_1',
        name: 'Sunil Patil',
        phone: '+91 98201 12345',
        vehicle_model: 'Tata Tigor EV',
        plate_number: 'MH 12 QX 4042',
        capacity: 4,
        status: 'AVAILABLE',
        current_location: { name: 'Pune (Kiwale)', lat: 18.6508, lng: 73.7438, km: 0 },
        current_trip_id: null,
        total_earnings_paise: 420000, // ₹4,200.00
        today_earnings_paise: 210000, // ₹2,100.00
        today_trips_count: 2,
        rating: 4.92,
        trip_history: [
          {
            trip_id: 'trip_seed_prev1',
            route: 'Pune → Lonavala',
            passengers: ['Vikram S.', 'Rohan M.'],
            fare_inr: 1250,
            completed_at: 'Today, 10:30 AM'
          },
          {
            trip_id: 'trip_seed_prev2',
            route: 'Panvel → Mumbai',
            passengers: ['Sneha K.'],
            fare_inr: 850,
            completed_at: 'Today, 01:15 PM'
          }
        ],
        updated_at: new Date().toISOString()
      },
      {
        id: 'drv_2',
        name: 'Ramesh Shinde',
        phone: '+91 98334 55678',
        vehicle_model: 'Maruti Ertiga CNG',
        plate_number: 'MH 14 AB 9812',
        capacity: 4,
        status: 'AVAILABLE',
        current_location: { name: 'Talegaon', lat: 18.7303, lng: 73.6766, km: 21 },
        current_trip_id: null,
        total_earnings_paise: 315000,
        today_earnings_paise: 140000,
        today_trips_count: 1,
        rating: 4.88,
        trip_history: [
          {
            trip_id: 'trip_seed_prev3',
            route: 'Talegaon → Mumbai',
            passengers: ['Kunal D.', 'Gaurav P.'],
            fare_inr: 1400,
            completed_at: 'Today, 11:45 AM'
          }
        ],
        updated_at: new Date().toISOString()
      },
      {
        id: 'drv_3',
        name: 'Amit Deshmukh',
        phone: '+91 98450 67890',
        vehicle_model: 'Hyundai Ioniq 5 EV',
        plate_number: 'MH 01 DX 1120',
        capacity: 4,
        status: 'AVAILABLE',
        current_location: { name: 'Panvel', lat: 19.0188, lng: 73.1098, km: 100 },
        current_trip_id: null,
        total_earnings_paise: 560000,
        today_earnings_paise: 280000,
        today_trips_count: 2,
        rating: 4.97,
        trip_history: [],
        updated_at: new Date().toISOString()
      },
      {
        id: 'drv_4',
        name: 'Rajesh Verma',
        phone: '+91 98190 23456',
        vehicle_model: 'Toyota Innova Hycross',
        plate_number: 'MH 02 BK 7766',
        capacity: 6,
        status: 'AVAILABLE',
        current_location: { name: 'Mumbai', lat: 19.0178, lng: 72.8478, km: 150 },
        current_trip_id: null,
        total_earnings_paise: 680000,
        today_earnings_paise: 350000,
        today_trips_count: 2,
        rating: 4.95,
        trip_history: [],
        updated_at: new Date().toISOString()
      }
    ],
    trips: [],
    dispatch_status: {
      is_running: false,
      last_run_at: new Date().toISOString(),
      active_window_seconds: 30,
      total_batches_dispatched: 0,
      total_passengers_pooled: 0,
      total_passenger_savings_paise: 0,
      total_co2_saved_kg: 0
    }
  };
}

class JsonStore {
  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      this.reset();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        this.reset();
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store Error] Failed to write db.json:', err.message);
    }
  }

  reset() {
    this.data = getInitialSeedData();
    this.save();
    return this.data;
  }

  // --- Rides ---
  getRides() {
    return this.data.rides;
  }

  getRideById(id) {
    return this.data.rides.find(r => r.id === id || r.rider_id === id);
  }

  addRide(ride) {
    this.data.rides.unshift(ride);
    this.save();
    return ride;
  }

  updateRide(id, patch) {
    const idx = this.data.rides.findIndex(r => r.id === id || r.rider_id === id);
    if (idx !== -1) {
      this.data.rides[idx] = { ...this.data.rides[idx], ...patch, updated_at: new Date().toISOString() };
      this.save();
      return this.data.rides[idx];
    }
    return null;
  }

  // --- Drivers ---
  getDrivers() {
    return this.data.drivers;
  }

  getDriverById(id) {
    return this.data.drivers.find(d => d.id === id);
  }

  updateDriver(id, patch) {
    const idx = this.data.drivers.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.data.drivers[idx] = { ...this.data.drivers[idx], ...patch, updated_at: new Date().toISOString() };
      this.save();
      return this.data.drivers[idx];
    }
    return null;
  }

  // --- Trips ---
  getTrips() {
    return this.data.trips;
  }

  getTripById(id) {
    return this.data.trips.find(t => t.id === id);
  }

  addTrip(trip) {
    this.data.trips.unshift(trip);
    this.save();
    return trip;
  }

  updateTrip(id, patch) {
    const idx = this.data.trips.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.trips[idx] = { ...this.data.trips[idx], ...patch, updated_at: new Date().toISOString() };
      this.save();
      return this.data.trips[idx];
    }
    return null;
  }

  // --- Dispatch status ---
  getDispatchStatus() {
    return this.data.dispatch_status;
  }

  updateDispatchStatus(patch) {
    this.data.dispatch_status = { ...this.data.dispatch_status, ...patch };
    this.save();
    return this.data.dispatch_status;
  }
}

const store = new JsonStore();

module.exports = store;
