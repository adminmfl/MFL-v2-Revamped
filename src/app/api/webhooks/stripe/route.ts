// POST /api/webhooks/stripe
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // TODO: Implement Stripe webhook handler
  return NextResponse.json({ received: true })
}

