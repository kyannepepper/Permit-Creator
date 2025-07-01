// Stripe product ID generator for park-specific costs
export function generateStripeProductId(parkId: number, costType: 'application' | 'permit', amount: number): string {
  // Generate consistent product IDs based on park and cost type
  // Format: {costType}_{parkId}_{amount}
  // Example: application_7_10, permit_7_25
  return `${costType}_${parkId}_${amount}`;
}

export const APPLICATION_FEE_OPTIONS = [
  { value: 10, label: '$10.00' },
  { value: 15, label: '$15.00' },
  { value: 20, label: '$20.00' }
];

export const PERMIT_FEE_OPTIONS = [
  { value: 15, label: '$15.00' },
  { value: 20, label: '$20.00' },
  { value: 25, label: '$25.00' },
  { value: 30, label: '$30.00' },
  { value: 35, label: '$35.00' },
  { value: 40, label: '$40.00' }
];

export function getStripeProductInfo(parkId: number, applicationCost: number, permitCost: number) {
  return {
    applicationCostStripeProductId: generateStripeProductId(parkId, 'application', applicationCost),
    permitCostStripeProductId: generateStripeProductId(parkId, 'permit', permitCost),
    totalCost: applicationCost + permitCost
  };
}