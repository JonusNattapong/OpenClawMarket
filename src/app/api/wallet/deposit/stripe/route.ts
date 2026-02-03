import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { isValidAmount } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/wallet/deposit/stripe - Create Stripe payment intent
export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe payment processing is not configured' },
      { status: 503 }
    );
  }
  // Rate limiting
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = req.cookies.get('ocm_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { amount } = await req.json();

    // Validate amount
    if (!isValidAmount(amount)) {
      return NextResponse.json({ error: 'Amount must be a positive number (max 1,000,000)' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (numAmount < 5) {
      return NextResponse.json({ error: 'Minimum deposit is 5 USD' }, { status: 400 });
    }

    if (numAmount > 10000) {
      return NextResponse.json({ error: 'Maximum deposit is 10,000 USD' }, { status: 400 });
    }

    // Convert USD to cents for Stripe
    const amountInCents = Math.round(numAmount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        userId: user.id,
        userName: user.name,
        amount: numAmount.toString(),
      },
      description: `OpenClawMarket Deposit - ${user.name}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        type: 'DEPOSIT',
        amount: numAmount,
        description: 'Stripe Deposit (Pending)',
        status: 'PENDING',
        hash: paymentIntent.id,
        toUserId: user.id,
        metadata: JSON.stringify({
          paymentMethod: 'stripe',
          currency: 'USD',
          paymentIntentId: paymentIntent.id,
        }),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction.id,
      amount: numAmount,
    });

  } catch (error) {
    console.error('Stripe payment intent error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to create payment. Please try again.' },
      { status: 500 }
    );
  }
}