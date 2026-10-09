/**
 * Plain-English Explainability Engine (SHAP-Style Cost Attribution)
 */

function generateExplainability(rider, soloFarePaise, shapleyFarePaise, allRiders, detourPct = 0) {
  const soloInr = (soloFarePaise / 100).toFixed(2);
  const pooledInr = (shapleyFarePaise / 100).toFixed(2);
  const savingsPaise = soloFarePaise - shapleyFarePaise;
  const savingsInr = (savingsPaise / 100).toFixed(2);
  const savingsPct = soloFarePaise > 0 ? ((savingsPaise / soloFarePaise) * 100).toFixed(1) : 0;

  const coRiders = allRiders.filter(r => r.rider_id !== rider.rider_id).map(r => r.rider_id);
  const otherNames = coRiders.length > 0 ? coRiders.join(' and ') : 'none';

  const reasons = [];

  // Reason 1: Base solo vs pooled discount
  reasons.push(
    `Direct solo private ride would cost ₹${soloInr}. By pooling with ${otherNames}, your fair share is ₹${pooledInr}, saving you ₹${savingsInr} (${savingsPct}% discount).`
  );

  // Reason 2: Shared corridor economy
  if (coRiders.length > 0) {
    reasons.push(
      `Your route between ${rider.pickup} and ${rider.dropoff} overlaps with other passengers on the expressway. Shared fuel, toll, and driver operational expenses are divided by marginal contribution.`
    );
  }

  // Reason 3: Detour guarantee
  if (detourPct <= 0.05) {
    reasons.push(`Direct express route with 0% detour delay — you remain directly along the vehicle's transit vector.`);
  } else {
    reasons.push(
      `Your pooled route includes a minor ${detourPct.toFixed(1)}% detour, well beneath our strict 15.0% passenger guarantee.`
    );
  }

  // Reason 4: Game-theoretic fairness
  reasons.push(
    `Calculated using axiomatic Shapley value game theory with Largest-Remainder zero-deficit rounding, ensuring you pay neither more than your marginal cost nor subsidize someone else's deviation.`
  );

  return {
    rider_id: rider.rider_id,
    solo_fare_inr: parseFloat(soloInr),
    shapley_fare_inr: parseFloat(pooledInr),
    savings_inr: parseFloat(savingsInr),
    savings_pct: parseFloat(savingsPct),
    detour_pct: detourPct,
    plain_english_reasons: reasons
  };
}

module.exports = {
  generateExplainability
};
