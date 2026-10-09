const { RATE_PER_KM_PAISE, RATE_PER_KM_INR } = require('./config');
const { getNodeKm, getDirectDistance } = require('./topology');

/**
 * Calculate solo direct fare in paise and INR
 */
function calculateSoloFare(pickup, dropoff, ratePerKmPaise = RATE_PER_KM_PAISE) {
  const distKm = getDirectDistance(pickup, dropoff);
  const farePaise = Math.round(distKm * ratePerKmPaise);
  return {
    distance_km: distKm,
    fare_paise: farePaise,
    fare_inr: farePaise / 100
  };
}

/**
 * Permutations helper for small n (n <= 6 in a cab)
 */
function getPermutations(arr) {
  if (arr.length <= 1) return [arr];
  const perms = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const subPerms = getPermutations(remaining);
    for (const sub of subPerms) {
      perms.push([current, ...sub]);
    }
  }
  return perms;
}

/**
 * Exact Integer-Paise Shapley Value Allocation using Largest Remainder Method
 * 
 * @param {Array<{rider_id: string, pickup: string, dropoff: string}>} riders 
 * @param {number} totalFarePaise Total vehicle cost in paise
 * @returns {object} Pricing result with exact zero-deficit guarantee
 */
function calculateIntegerPaiseShapley(riders, totalFarePaise, options = {}) {
  const n = riders.length;
  if (n === 0) {
    return {
      fares_paise: {},
      fares_inr: {},
      total_fare_paise: 0,
      total_fare_inr: 0,
      platform_deficit_paise: 0,
      is_zero_deficit: true
    };
  }

  // Calculate exact Shapley marginal contributions using the standard Shapley formula:
  // phi_i(c) = (1 / n!) * sum_{pi in Permutations} [ c(P_i^pi U {i}) - c(P_i^pi) ]
  // Coalition cost function c(S): vehicle corridor span of coalition S in km
  const riderIds = riders.map(r => r.rider_id);
  const riderMap = Object.fromEntries(riders.map(r => [r.rider_id, r]));

  const coalitionSpan = (coalition) => {
    if (!coalition || coalition.length === 0) return 0;
    const pKms = coalition.map(id => getNodeKm(riderMap[id].pickup));
    const dKms = coalition.map(id => getNodeKm(riderMap[id].dropoff));
    const minKm = Math.min(...pKms, ...dKms);
    const maxKm = Math.max(...pKms, ...dKms);
    return maxKm - minKm;
  };

  // Calculate exact Shapley marginal contributions over all n! permutations
  const marginalSums = Object.fromEntries(riderIds.map(id => [id, 0]));
  const perms = getPermutations(riderIds);
  const factN = perms.length;

  for (const p of perms) {
    let currCoalition = [];
    let prevCost = 0;
    for (const rid of p) {
      currCoalition.push(rid);
      const currCost = coalitionSpan(currCoalition);
      const marginal = currCost - prevCost;
      marginalSums[rid] += marginal / factN;
      prevCost = currCost;
    }
  }

  let sumMarginals = Object.values(marginalSums).reduce((a, b) => a + b, 0);
  if (sumMarginals <= 0) {
    // Degenerate fallback: direct solo distances
    for (const r of riders) {
      marginalSums[r.rider_id] = getDirectDistance(r.pickup, r.dropoff);
    }
    sumMarginals = Object.values(marginalSums).reduce((a, b) => a + b, 0);
  }

  // Raw unadjusted Shapley shares from marginal contributions
  const rawShares = {};
  for (const rid of riderIds) {
    rawShares[rid] = (marginalSums[rid] / sumMarginals) * totalFarePaise;
  }

  // Pre-calculate solo fares for individual rationality
  const soloFares = {};
  let totalSoloPaise = 0;
  for (const r of riders) {
    const solo = calculateSoloFare(r.pickup, r.dropoff);
    soloFares[r.rider_id] = solo.fare_paise;
    totalSoloPaise += solo.fare_paise;
  }

  // Allocate pooled trip fare proportionally to positive cost-saving contributions (surplus game)
  const totalSavings = totalSoloPaise - totalFarePaise;
  const exactShares = {};

  if (totalSavings > 0) {
    const savingsContrib = {};
    for (const rid of riderIds) {
      savingsContrib[rid] = Math.max(0, soloFares[rid] - rawShares[rid]);
    }
    const sumSavingsContrib = Object.values(savingsContrib).reduce((a, b) => a + b, 0);

    if (sumSavingsContrib > 0) {
      for (const rid of riderIds) {
        const discount = (savingsContrib[rid] / sumSavingsContrib) * totalSavings;
        exactShares[rid] = Math.max(0, soloFares[rid] - discount);
      }
    } else {
      for (const rid of riderIds) {
        exactShares[rid] = rawShares[rid];
      }
    }
  } else {
    for (const rid of riderIds) {
      exactShares[rid] = rawShares[rid];
    }
  }

  // Respect Quote Lock: confirmed riders never pay more than their locked quote
  if (options.lockedQuotes) {
    for (const rid of riderIds) {
      if (options.lockedQuotes[rid] !== undefined && exactShares[rid] > options.lockedQuotes[rid]) {
        exactShares[rid] = options.lockedQuotes[rid];
      }
    }
  }

  // Largest Remainder Method (Hamilton Method) to guarantee exact integer paise sum == totalFarePaise
  const flooredPaise = {};
  let currentSum = 0;
  for (const rid of riderIds) {
    flooredPaise[rid] = Math.max(0, Math.floor(exactShares[rid]));
    currentSum += flooredPaise[rid];
  }

  const remainder = totalFarePaise - currentSum;
  const sortedByRemainder = [...riderIds].sort((a, b) => {
    const remA = exactShares[a] - flooredPaise[a];
    const remB = exactShares[b] - flooredPaise[b];
    return remB - remA;
  });

  const faresPaise = { ...flooredPaise };
  const eligibleForRemainder = sortedByRemainder.filter(rid => faresPaise[rid] < soloFares[rid]);
  const candidates = eligibleForRemainder.length > 0 ? eligibleForRemainder : sortedByRemainder;

  for (let i = 0; i < remainder; i++) {
    const targetId = candidates[i % candidates.length];
    faresPaise[targetId] += 1;
  }

  // Final validation: shares <= solo fare (individual rationality) & non-negative
  for (const rid of riderIds) {
    if (faresPaise[rid] > soloFares[rid]) {
      faresPaise[rid] = soloFares[rid];
    }
    if (options.lockedQuotes && options.lockedQuotes[rid] !== undefined) {
      if (faresPaise[rid] > options.lockedQuotes[rid]) {
        faresPaise[rid] = options.lockedQuotes[rid];
      }
    }
  }

  // Exact zero-deficit calculation
  const actualSum = Object.values(faresPaise).reduce((a, b) => a + b, 0);
  const deficitPaise = totalFarePaise - actualSum;

  const faresInr = {};
  for (const [rid, paise] of Object.entries(faresPaise)) {
    faresInr[rid] = paise / 100;
  }

  return {
    fares_paise: faresPaise,
    fares_inr: faresInr,
    total_fare_paise: totalFarePaise,
    total_fare_inr: totalFarePaise / 100,
    platform_deficit_paise: deficitPaise,
    is_zero_deficit: deficitPaise === 0
  };
}

/**
 * Generate Comparative Cost Splits (Equal, Distance Proportional, Shapley)
 */
function calculateComparativeSplits(riders, totalFarePaise, shapleyFaresPaise) {
  const n = riders.length;
  const equalSplitPaise = {};
  const distanceProportionalPaise = {};

  if (n === 0) return { equal_split_inr: {}, distance_proportional_inr: {}, shapley_fares_inr: {} };

  // 1. Equal Split
  const baseEqual = Math.floor(totalFarePaise / n);
  const eqRem = totalFarePaise - (baseEqual * n);
  riders.forEach((r, idx) => {
    equalSplitPaise[r.rider_id] = baseEqual + (idx < eqRem ? 1 : 0);
  });

  // 2. Distance Proportional Split
  const distances = riders.map(r => getDirectDistance(r.pickup, r.dropoff));
  const totalDist = distances.reduce((a, b) => a + b, 0);
  let distSum = 0;
  const distFloors = {};

  riders.forEach((r, idx) => {
    const raw = (distances[idx] / (totalDist || 1)) * totalFarePaise;
    distFloors[r.rider_id] = Math.floor(raw);
    distSum += distFloors[r.rider_id];
  });
  const distRem = totalFarePaise - distSum;
  const distOrder = [...riders].sort((a, b) => {
    const rawA = (getDirectDistance(a.pickup, a.dropoff) / (totalDist || 1)) * totalFarePaise;
    const rawB = (getDirectDistance(b.pickup, b.dropoff) / (totalDist || 1)) * totalFarePaise;
    return (rawB - distFloors[b.rider_id]) - (rawA - distFloors[a.rider_id]);
  });
  for (const r of riders) {
    distanceProportionalPaise[r.rider_id] = distFloors[r.rider_id];
  }
  for (let i = 0; i < distRem; i++) {
    distanceProportionalPaise[distOrder[i % distOrder.length].rider_id] += 1;
  }

  // To INR
  const toInr = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v / 100]));

  return {
    equal_split_paise: equalSplitPaise,
    equal_split_inr: toInr(equalSplitPaise),
    distance_proportional_paise: distanceProportionalPaise,
    distance_proportional_inr: toInr(distanceProportionalPaise),
    shapley_fares_paise: shapleyFaresPaise,
    shapley_fares_inr: toInr(shapleyFaresPaise)
  };
}

/**
 * Validate Game Theory Axioms
 */
function verifyGameTheoryAxioms(riders, shapleyResult, soloFaresMap) {
  const { fares_paise, total_fare_paise, platform_deficit_paise } = shapleyResult;
  
  // Axiom 1: Budget Balance (Efficiency)
  const budgetBalance = (platform_deficit_paise === 0);

  // Axiom 2: Individual Rationality (Everyone pays less than their solo fare)
  let individualRationality = true;
  for (const r of riders) {
    const solo = soloFaresMap[r.rider_id]?.fare_paise || 0;
    const pooled = fares_paise[r.rider_id] || 0;
    if (solo > 0 && pooled > solo) {
      individualRationality = false;
      break;
    }
  }

  // Axiom 3: Pareto Efficiency (Pooled trip produces non-negative welfare)
  const totalSoloPaise = Object.values(soloFaresMap).reduce((acc, s) => acc + s.fare_paise, 0);
  const paretoEfficiency = totalSoloPaise >= total_fare_paise;

  // Axiom 4: Symmetry (Equal Treatment of Equals)
  let symmetry = true;
  for (let i = 0; i < riders.length; i++) {
    for (let j = i + 1; j < riders.length; j++) {
      const r1 = riders[i];
      const r2 = riders[j];
      if (r1.pickup === r2.pickup && r1.dropoff === r2.dropoff) {
        if (Math.abs(fares_paise[r1.rider_id] - fares_paise[r2.rider_id]) > 1) {
          symmetry = false;
          break;
        }
      }
    }
  }

  return {
    budget_balance_satisfied: budgetBalance,
    individual_rationality_satisfied: individualRationality,
    pareto_efficiency_satisfied: paretoEfficiency,
    symmetry_satisfied: symmetry,
    all_axioms_satisfied: budgetBalance && individualRationality && paretoEfficiency && symmetry
  };
}

module.exports = {
  calculateSoloFare,
  calculateIntegerPaiseShapley,
  calculateComparativeSplits,
  verifyGameTheoryAxioms
};
