// Stripe product ID generator for park-specific fees
export function generateStripeProductId(parkId: number, feeType: 'application' | 'permit', amount: number): string {
  // Generate consistent product IDs based on park and fee type
  // Format: {feeType}_{parkId}_{amount}
  // Example: application_7_10, permit_7_25
  return `${feeType}_${parkId}_${amount}`;
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

export function getStripeProductInfo(parkId: number, applicationFee: number, permitFee: number) {
  return {
    applicationFeeStripeProductId: generateStripeProductId(parkId, 'application', applicationFee),
    permitFeeStripeProductId: generateStripeProductId(parkId, 'permit', permitFee),
    totalFee: applicationFee + permitFee
  };
}