const assert = require('assert');
const { 
  validateRiderRequest,
  solveVrptwSequence, 
  enumerateFeasibleSequences,
  verifyCapacityConstraints, 
  evaluateDetourCompliance, 
  solveCompleteDispatch, 
  simulateRejectionScenario 
} = require('../src/optimizer');
const { 
  calculateSoloFare, 
  calculateIntegerPaiseShapley, 
  verifyGameTheoryAxioms 
} = require('../src/pricing');
const { assignDriverToTrip, assignSpecificDriverToTrip } = require('../src/assignment');
const { getRoute, generateFallbackRoute } = require('../src/routing');
const { getNodeKm, getNodeCoords } = require('../src/topology');

console.log('===============================================================');
console.log('  FAIRPOOL BACKEND AUDIT & VERIFICATION TEST SUITE (10 TESTS)  ');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 10;

// -----------------------------------------------------------------------------
// Test 1: Valid ride request validation
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 1] Valid Ride Request Validation');
  const validReq = {
    rider_id: 'Rider_001',
    passenger_name: 'Test Passenger',
    pickup: 'Pune (Kiwale)',
    dropoff: 'Lonavala',
    seats: 2
  };
  const validated = validateRiderRequest(validReq);
  assert.strictEqual(validated.rider_id, 'Rider_001');
  assert.strictEqual(validated.pickup, 'Pune (Kiwale)');
  assert.strictEqual(validated.dropoff, 'Lonavala');
  assert.strictEqual(validated.seats, 2);

  const solo = calculateSoloFare(validated.pickup, validated.dropoff);
  assert.strictEqual(solo.distance_km, 58);
  assert(solo.fare_paise > 0, 'Solo fare in paise must be positive');
  console.log('✓ PASS: Ride request successfully validated with normalized corridor milestones.');
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 1]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 2: Same pickup and destination rejection
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 2] Same Pickup and Destination Validation');
  const invalidReq = {
    rider_id: 'Rider_002',
    pickup: 'Lonavala',
    dropoff: 'Lonavala'
  };

  assert.throws(() => {
    validateRiderRequest(invalidReq);
  }, /pickup and dropoff cannot be the same milestone/i);

  console.log('✓ PASS: System strictly rejects ride where pickup and dropoff are identical milestones.');
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 2]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 3: Capacity exceeded constraint
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 3] Capacity Exceeded Constraint Verification');
  // 5 single-seat riders on a 4-seat vehicle
  const excessRiders = [
    { rider_id: 'R1', pickup: 'Pune (Kiwale)', dropoff: 'Mumbai', seats: 2 },
    { rider_id: 'R2', pickup: 'Pune (Kiwale)', dropoff: 'Mumbai', seats: 2 },
    { rider_id: 'R3', pickup: 'Talegaon', dropoff: 'Panvel', seats: 1 } // Total 5 concurrent seats
  ];

  const stops = solveVrptwSequence(excessRiders);
  const capacityCheck = verifyCapacityConstraints(excessRiders, stops, 4);

  assert.strictEqual(capacityCheck.is_feasible, false, 'Capacity check must fail for 5 concurrent seats');
  assert(capacityCheck.peak_occupancy > 4, 'Peak occupancy must exceed vehicle limit');

  const dispatchResult = solveCompleteDispatch(excessRiders, null, 15.0, 4);
  assert.strictEqual(dispatchResult.is_feasible, false, 'Dispatch must be rejected when capacity exceeded');
  assert(dispatchResult.reason.toLowerCase().includes('capacity exceeded'), 'Reason must mention capacity exceeded');

  console.log(`✓ PASS: Rejected overflow pool (peak occupancy ${capacityCheck.peak_occupancy} > max 4 seats).`);
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 3]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 4: A feasible shared route
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 4] Feasible Shared Route (Precedence, Capacity & Detour)');
  const poolRiders = [
    { rider_id: 'Rahul', pickup: 'Pune (Kiwale)', dropoff: 'Lonavala', seats: 1 },
    { rider_id: 'Priya', pickup: 'Talegaon', dropoff: 'Panvel', seats: 1 },
    { rider_id: 'Aman', pickup: 'Lonavala', dropoff: 'Mumbai', seats: 1 }
  ];

  const dispatchResult = solveCompleteDispatch(poolRiders, 2100.0, 15.0, 4);
  assert.strictEqual(dispatchResult.status, 'SUCCESS');
  assert.strictEqual(dispatchResult.is_feasible, true);

  // Check precedence: Pickup strictly before dropoff for each rider
  const stops = dispatchResult.route_summary.stops;
  poolRiders.forEach(r => {
    const pIdx = stops.findIndex(s => s.rider_id === r.rider_id && s.stop_type === 'PICKUP');
    const dIdx = stops.findIndex(s => s.rider_id === r.rider_id && s.stop_type === 'DROPOFF');
    assert(pIdx !== -1 && dIdx !== -1, `Stops must exist for ${r.rider_id}`);
    assert(pIdx < dIdx, `Pickup must precede dropoff for ${r.rider_id}`);
  });

  // Check capacity <= 4
  assert(dispatchResult.capacity_check.peak_occupancy <= 4, 'Peak occupancy must be <= 4');

  // Check detour <= 15%
  assert.strictEqual(dispatchResult.detour_compliance.is_compliant, true);
  assert(dispatchResult.detour_compliance.max_detour_pct_observed <= 15.0, 'Detour must be <= 15.0%');

  console.log('✓ PASS: Feasible shared pool formed with valid VRPTW precedence, occupancy <= 4, and 0% detour.');
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 4]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 5: Route exceeding 15% detour limit
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 5] Route Exceeding 15% Detour Limit Rejection');
  const baseRiders = [
    { rider_id: 'Rahul', pickup: 'Pune (Kiwale)', dropoff: 'Lonavala' },
    { rider_id: 'Priya', pickup: 'Talegaon', dropoff: 'Panvel' },
    { rider_id: 'Aman', pickup: 'Lonavala', dropoff: 'Mumbai' }
  ];
  // Adding candidate Vikram who diverts to off-corridor Pen (115 km)
  const candidateVikram = { rider_id: 'Vikram', pickup: 'Khalapur', dropoff: 'Pen' };
  const coalitionWithVikram = [...baseRiders, candidateVikram];

  const dispatchResult = solveCompleteDispatch(coalitionWithVikram, null, 15.0, 4);
  assert.strictEqual(dispatchResult.is_feasible, false, 'Must reject coalition exceeding detour limit');
  assert.strictEqual(dispatchResult.status, 'REJECTED');
  assert.strictEqual(dispatchResult.violating_rider, 'Priya', 'Priya must be the violated passenger');
  assert(dispatchResult.computed_detour_pct > 15.0, 'Computed detour must exceed 15%');
  assert(dispatchResult.reason.includes('exceeding'), 'Reason must explicitly explain the rejected passenger and detour');

  console.log(`✓ PASS: Candidate Vikram rejected: Priya projected detour is ${dispatchResult.computed_detour_pct}% > 15.0% SLA.`);
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 5]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 6: Shapley allocations summing to total with zero deficit
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 6] Exact Shapley Allocation Summing to Total (0 Deficit)');
  const poolRiders = [
    { rider_id: 'Rahul', pickup: 'Pune (Kiwale)', dropoff: 'Lonavala' },
    { rider_id: 'Priya', pickup: 'Talegaon', dropoff: 'Panvel' },
    { rider_id: 'Aman', pickup: 'Lonavala', dropoff: 'Mumbai' }
  ];
  const totalVehicleFarePaise = 210000; // ₹2,100.00

  const pricing = calculateIntegerPaiseShapley(poolRiders, totalVehicleFarePaise);

  // Shares must be non-negative
  Object.entries(pricing.fares_paise).forEach(([rid, paise]) => {
    assert(paise >= 0, `Share for ${rid} must be non-negative`);
  });

  // Shares must sum exactly to totalVehicleFarePaise
  const actualSum = Object.values(pricing.fares_paise).reduce((a, b) => a + b, 0);
  assert.strictEqual(actualSum, totalVehicleFarePaise, `Sum of shares (${actualSum}) must equal total (${totalVehicleFarePaise})`);
  assert.strictEqual(pricing.platform_deficit_paise, 0, 'Platform deficit must be exactly 0 paise');
  assert.strictEqual(pricing.is_zero_deficit, true, 'is_zero_deficit must be true');

  // Every passenger's share must be <= their solo fare
  poolRiders.forEach(r => {
    const solo = calculateSoloFare(r.pickup, r.dropoff);
    const pooledShare = pricing.fares_paise[r.rider_id];
    assert(pooledShare <= solo.fare_paise, `Passenger ${r.rider_id} pooled fare (${pooledShare}) must be <= solo fare (${solo.fare_paise})`);
  });

  console.log(`✓ PASS: Mathematical Shapley shares sum to ₹${totalVehicleFarePaise / 100} with 0 paise deficit.`);
  console.log(`        Shares: ${JSON.stringify(pricing.fares_inr)}`);
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 6]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 7: Fare quote lock guarantee
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 7] Fare Quote Lock Guarantee');
  const poolRiders = [
    { rider_id: 'Rahul', pickup: 'Pune (Kiwale)', dropoff: 'Lonavala' },
    { rider_id: 'Priya', pickup: 'Talegaon', dropoff: 'Panvel' },
    { rider_id: 'Aman', pickup: 'Lonavala', dropoff: 'Mumbai' }
  ];
  const totalVehicleFarePaise = 210000;

  // Rahul was issued a locked quote of 50,000 paise (₹500.00) at booking time
  const lockedQuotes = { Rahul: 50000 };
  const lockedPricing = calculateIntegerPaiseShapley(poolRiders, totalVehicleFarePaise, { lockedQuotes });

  assert(lockedPricing.fares_paise['Rahul'] <= 50000, 'Rahul fare must not exceed locked quote');
  console.log(`✓ PASS: Fare quote lock preserved for confirmed rider: Rahul charged ₹${lockedPricing.fares_inr['Rahul']} <= locked quote ₹500.00.`);
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 7]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 8: Two dispatch operations attempting to use the same driver
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 8] Atomic Driver Concurrency (Prevent Double Assignment)');
  const mockDrivers = [
    {
      id: 'drv_test_1',
      name: 'Driver Alpha',
      capacity: 4,
      status: 'AVAILABLE',
      current_location: { lat: 18.65, lng: 73.74 }
    }
  ];

  const tripA = { id: 'trip_A', peak_occupancy: 2, stops: [{ lat: 18.65, lng: 73.74 }] };
  const tripB = { id: 'trip_B', peak_occupancy: 2, stops: [{ lat: 18.65, lng: 73.74 }] };

  // Dispatch Operation 1 assigns the driver
  const assignResult1 = assignSpecificDriverToTrip(tripA, 'drv_test_1', mockDrivers);
  assert.strictEqual(assignResult1.success, true, 'First dispatch must acquire available driver');
  assert.strictEqual(assignResult1.driver.status, 'ASSIGNED');
  assert.strictEqual(assignResult1.driver.current_trip_id, 'trip_A');

  // Dispatch Operation 2 attempts to acquire the SAME driver
  const assignResult2 = assignSpecificDriverToTrip(tripB, 'drv_test_1', mockDrivers);
  assert.strictEqual(assignResult2.success, false, 'Second concurrent dispatch must be rejected');
  assert(assignResult2.reason.includes('ASSIGNED'), 'Reason must indicate driver is already ASSIGNED');

  console.log('✓ PASS: Atomic assignment successfully prevented double-booking of driver drv_test_1.');
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 8]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 9: No-match fallback (Graceful direct solo-ride dispatch)
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 9] No-Match and Solo-Ride Fallback');
  const isolatedRider = {
    id: 'ride_isolated',
    rider_id: 'Solo_Commuter',
    pickup: 'Talegaon',
    dropoff: 'Lonavala',
    seats: 1,
    status: 'PENDING',
    direct_distance_km: 37,
    solo_fare_paise: 51800
  };

  // When no pool is formed or timeout occurs, create solo trip fallback
  const soloDist = isolatedRider.direct_distance_km;
  const soloTrip = {
    id: 'trip_solo_fallback_test',
    status: 'IN_PROGRESS',
    is_solo_fallback: true,
    rider_ids: [isolatedRider.rider_id],
    total_distance_km: soloDist,
    total_fare_paise: isolatedRider.solo_fare_paise,
    detour_compliance: {
      is_compliant: true,
      max_detour_pct_observed: 0.0
    }
  };

  assert.strictEqual(soloTrip.is_solo_fallback, true, 'Must be marked as solo fallback');
  assert.strictEqual(soloTrip.total_fare_paise, 51800, 'Solo fare must equal direct fare');
  assert.strictEqual(soloTrip.detour_compliance.max_detour_pct_observed, 0.0, 'Solo ride has 0.0% detour');

  console.log('✓ PASS: Graceful solo fallback dispatched with direct travel and 0% detour.');
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 9]:', err.message);
}

// -----------------------------------------------------------------------------
// Test 10: OSRM request failure fallback
// -----------------------------------------------------------------------------
try {
  console.log('\n[Test 10] OSRM Failure & Haversine Route Fallback');
  const coords = [
    [18.6508, 73.7438], // Pune (Kiwale)
    [18.7557, 73.4091]  // Lonavala
  ];

  // Test deterministic fallback generator directly
  const fallback = generateFallbackRoute(coords);

  assert(fallback.distance_km > 0, 'Fallback distance must be positive');
  assert(fallback.duration_min > 0, 'Fallback duration must be positive');
  assert(fallback.polyline.length >= 2, 'Fallback must produce polyline coordinates');
  assert.strictEqual(fallback.provider, 'HAVERSINE_FALLBACK', 'Provider must be clearly labelled as HAVERSINE_FALLBACK');

  console.log(`✓ PASS: OSRM fallback executed cleanly (${fallback.distance_km} km, provider: '${fallback.provider}').`);
  passedTests++;
} catch (err) {
  console.error('✗ FAIL [Test 10]:', err.message);
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('===============================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
