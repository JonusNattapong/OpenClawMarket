import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// POST /api/wallet/deposit - Deposit funds
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ocm_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { amount, paymentMethod = 'stripe_test' } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (amount > 10000) {
      return NextResponse.json({ error: 'Maximum deposit is 10,000 USD' }, { status: 400 });
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    // Create deposit transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: amount } },
      });

      // Record transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          amount,
          description: `Fiat Deposit via ${paymentMethod}`,
          status: 'COMPLETED',
          hash: txHash,
          toUserId: user.id,
          metadata: JSON.stringify({ paymentMethod, currency: 'USD' }),
        },
      });

      return { user: updatedUser, transaction };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ${amount} SHELL`,
      newBalance: result.user.balance,
      transaction: {
        id: result.transaction.id,
        hash: txHash,
        amount,
      },
    });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { error: 'Failed to process deposit' },
      { status: 500 }
    );
  }
}
