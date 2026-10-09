const assert = require('assert');
const { 
  solveVrptwSequence, 
  evaluateDetourCompliance, 
  verifyCapacityConstraints, 
  solveCompleteDispatch, 
  simulateRejectionScenario 
} = require('../src/optimizer');
const { 
  calculateIntegerPaiseShapley, 
  calculateSoloFare, 
  verifyGameTheoryAxioms 
} = require('../src/pricing');
const { run100CommuterBenchmark } = require('../src/simulation');

console.log('--- RUNNING FAIRPOOL ALGORITHMIC ENGINE TESTS ---');

// 1. Test Golden Corridor Shapley Values
console.log('\n[Test 1] Golden Corridor Shapley Allocation (Rahul, Priya, Aman @ ₹2,100)');
const riders = [
  { rider_id: 'Rahul', pickup: 'Pune (Kiwale)', dropoff: 'Lonavala' },
  { rider_id: 'Priya', pickup: 'Talegaon', dropoff: 'Panvel' },
  { rider_id: 'Aman', pickup: 'Lonavala', dropoff: 'Mumbai' }
];

const totalPaise = 210000; // ₹2,100.00
const shapley = calculateIntegerPaiseShapley(riders, totalPaise);

assert.strictEqual(shapley.fares_paise['Rahul'], 55300, 'Rahul must be 55,300 paise (₹553.00)');
assert.strictEqual(shapley.fares_paise['Priya'], 55300, 'Priya must be 55,300 paise (₹553.00)');
assert.strictEqual(shapley.fares_paise['Aman'], 99400, 'Aman must be 99,400 paise (₹994.00)');
assert.strictEqual(shapley.platform_deficit_paise, 0, 'Platform deficit must be exactly 0 paise');
assert.strictEqual(shapley.is_zero_deficit, true, 'Zero deficit flag must be true');
console.log('✓ PASS: Mathematical Shapley values: Rahul ₹553, Priya ₹553, Aman ₹994. Deficit: 0 paise.');

// 2. Test VRPTW Precedence Solver
console.log('\n[Test 2] VRPTW Precedence Solver (Dropoff before Pickup at Lonavala)');
const stops = solveVrptwSequence(riders);
assert.strictEqual(stops.length, 6, 'Must generate exactly 6 stops for 3 riders');

// Verify stop sequence
const stopSeq = stops.map(s => `${s.rider_id}_${s.stop_type}`);
console.log('Sequence:', stopSeq.join(' -> '));

// At index 2 and 3: Lonavala km 58
// Rahul's DROPOFF must be at index 2, Aman's PICKUP must be at index 3
assert.strictEqual(stops[2].rider_id, 'Rahul');
assert.strictEqual(stops[2].stop_type, 'DROPOFF');
assert.strictEqual(stops[3].rider_id, 'Aman');
assert.strictEqual(stops[3].stop_type, 'PICKUP');
console.log('✓ PASS: Rahul drops off before Aman boards at Lonavala (km 58).');

// 3. Test Capacity Constraint Verification
console.log('\n[Test 3] Capacity Constraint Verification');
const capacity = verifyCapacityConstraints(riders, stops, 4);
assert.strictEqual(capacity.is_feasible, true, 'Peak occupancy should be feasible');
assert.strictEqual(capacity.peak_occupancy, 2, 'Peak occupancy should be 2 passengers');
console.log(`✓ PASS: Peak occupancy is ${capacity.peak_occupancy}/4 seats.`);

// 4. Test Detour Compliance (Golden corridor <= 15%)
console.log('\n[Test 4] Detour Compliance Verification (Golden Corridor)');
const detour = evaluateDetourCompliance(riders, stops, 15.0);
assert.strictEqual(detour.is_compliant, true, 'Golden corridor must be 100% compliant');
assert.strictEqual(detour.max_detour_pct_observed, 0.0, 'Golden corridor detour is 0.0%');
console.log('✓ PASS: Detour compliance verified (0.0% detour, SLA cap is 15.0%).');

// 5. Test Vikram Detour Rejection Scenario
console.log('\n[Test 5] Vikram Detour Rejection Scenario');
const rejection = simulateRejectionScenario();
assert.strictEqual(rejection.is_accepted, false, 'Vikram must be rejected');
assert.strictEqual(rejection.violating_rider, 'Priya', 'Priya must be the violated rider');
assert(rejection.observed_detour_pct > 15.0, 'Detour must exceed 15%');
console.log(`✓ PASS: Vikram candidate correctly rejected (${rejection.rejection_reason}).`);

// 6. Test 100-Commuter Simulation Scorecard
console.log('\n[Test 6] 100-Commuter Scale Simulation Scorecard');
const sim = run100CommuterBenchmark(42);
assert.strictEqual(sim.commuters_total, 100, 'Must process 100 commuters');
assert.strictEqual(sim.financials.is_zero_deficit_verified, true, 'Deficit must be 0 across all 100 commuters');
assert.strictEqual(sim.quality_of_service.detour_sla_compliance_pct, 100.0, '100% detour SLA compliance');
console.log(`✓ PASS: 100 commuters simulated: ${sim.fleet_reduction_ratio}, saved ₹${sim.financials.total_savings_inr} (${sim.financials.savings_pct}%), Deficit: 0 paise.`);

console.log('\nALL 6 ALGORITHMIC ENGINE TESTS PASSED SUCCESFULLY!\n');
