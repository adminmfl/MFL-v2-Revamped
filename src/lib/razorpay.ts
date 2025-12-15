/**
 * Razorpay Integration
 * Handles order creation and payment verification
 */

import crypto from 'crypto';

// Lazy initialization to avoid errors during build/dev
let razorpayInstance: any = null;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay keys not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local'
    );
  }

  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

export type PaymentOrder = {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
};

/**
 * Create a Razorpay order
 * @param amount - Amount in INR (not paise)
 * @param leagueId - League ID for receipt
 */
export async function createOrder(amount: number, leagueId: string): Promise<PaymentOrder> {
  const razorpay = getRazorpay();

  // Receipt must be <= 40 chars. Use short ID from league UUID + timestamp suffix
  const shortId = leagueId.split('-')[0]; // First segment of UUID (8 chars)
  const timestamp = Date.now().toString(36); // Base36 timestamp (shorter)
  const receipt = `mfl_${shortId}_${timestamp}`.substring(0, 40);

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // Convert to paise
    currency: 'INR',
    receipt,
    notes: {
      leagueId,
    },
  });

  return order;
}

/**
 * Verify Razorpay payment signature
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Razorpay signature
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    console.error('RAZORPAY_KEY_SECRET not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${orderId}|${paymentId}`);
  const generatedSignature = hmac.digest('hex');

  return generatedSignature === signature;
}

/**
 * Get Razorpay key ID (for client-side)
 */
export function getKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error('RAZORPAY_KEY_ID not configured');
  }
  return keyId;
}
