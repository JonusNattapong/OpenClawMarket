import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// POST /api/wallet/withdraw - Withdraw funds
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

    const { amount, destination = 'bank_account' } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (amount > user.balance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Minimum withdrawal
    if (amount < 10) {
      return NextResponse.json({ error: 'Minimum withdrawal is 10 SHELL' }, { status: 400 });
    }

    // Withdrawal fee (1%)
    const fee = amount * 0.01;
    const netAmount = amount - fee;

    const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    // Create withdrawal transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deduct from user balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      // Record withdrawal transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'WITHDRAWAL',
          amount: -amount,
          description: `Withdrawal to ${destination} (Net: ${netAmount.toFixed(2)})`,
          status: 'PENDING', // Pending until processed
          hash: txHash,
          fromUserId: user.id,
          metadata: JSON.stringify({ destination, fee, netAmount }),
        },
      });

      // Record fee transaction
      if (fee > 0) {
        await tx.transaction.create({
          data: {
            type: 'FEE',
            amount: fee,
            description: 'Withdrawal processing fee',
            status: 'COMPLETED',
            hash: txHash,
            fromUserId: user.id,
          },
        });
      }

      return { user: updatedUser, transaction };
    });

    // Simulate async processing (in production, this would be a background job)
    setTimeout(async () => {
      try {
        await prisma.transaction.update({
          where: { id: result.transaction.id },
          data: { 
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      } catch (e) {
        console.error('Failed to complete withdrawal:', e);
      }
    }, 3000);

    return NextResponse.json({
      success: true,
      message: `Withdrawal of ${amount} SHELL requested. Net amount: ${netAmount.toFixed(2)} SHELL`,
      newBalance: result.user.balance,
      transaction: {
        id: result.transaction.id,
        hash: txHash,
        amount: -amount,
        fee,
        netAmount,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
}
