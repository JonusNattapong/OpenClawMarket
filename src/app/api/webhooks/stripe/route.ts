import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/db';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/webhooks/stripe - Handle Stripe webhooks
export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe payment processing is not configured' },
      { status: 503 }
    );
  }
  try {
    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPayment);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const transactionId = paymentIntent.metadata?.transactionId;

  if (!transactionId) {
    console.error('No transaction ID in payment intent metadata');
    return;
  }

  // First get the existing transaction
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existingTransaction) {
    console.error('Transaction not found:', transactionId);
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update transaction status
    const dbTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: JSON.stringify({
          ...JSON.parse(existingTransaction.metadata || '{}'),
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge,
        }),
      },
    });

    // Update user balance
    const user = await tx.user.update({
      where: { id: dbTransaction.toUserId! },
      data: {
        balance: { increment: dbTransaction.amount },
      },
    });

    return { transaction: dbTransaction, user };
  });

  console.log(`Payment completed: ${result.transaction.amount} USD for user ${result.user.name}`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const transactionId = paymentIntent.metadata?.transactionId;

  if (!transactionId) {
    console.error('No transaction ID in failed payment intent');
    return;
  }

  // First get the existing transaction
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existingTransaction) {
    console.error('Transaction not found:', transactionId);
    return;
  }

  // Mark transaction as failed
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      metadata: JSON.stringify({
        ...JSON.parse(existingTransaction.metadata || '{}'),
        failureReason: 'Payment failed',
        stripePaymentIntentId: paymentIntent.id,
      }),
    },
  });

  console.log(`Payment failed for transaction ${transactionId}`);
}