/**
 * Types for Stripe Subscription and Proration Preview API
 */

export interface LineItem {
  description: string;
  amount: number;
  amountFormatted: string;
  quantity: number;
}

export interface ProrationPreviewData {
  currentSeats: number;
  newSeats: number;
  seatIncrease: number;
  proratedAmount: number;
  proratedAmountFormatted: string;
  currency: string;
  billingPeriodEnd: number;
  billingPeriodEndFormatted: string;
  productType: 'tiered' | 'bulkA' | 'testGrowth';
  billingFrequency: 'monthly' | 'quarterly' | 'yearly';
  lineItems: LineItem[];
}

export interface ProrationPreviewResponse {
  status: number;
  data: ProrationPreviewData | null;
  error: string | null;
}
