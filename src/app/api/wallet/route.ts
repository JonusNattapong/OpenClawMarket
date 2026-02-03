import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';

// GET /api/wallet - Get wallet info & transactions
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ocm_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: user.id },
          { toUserId: user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format transactions
    const formattedTx = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      status: tx.status,
      hash: tx.hash,
      date: tx.createdAt.toISOString(),
    }));

    return NextResponse.json({
      balance: user.balance,
      transactions: formattedTx,
    });
  } catch (error) {
    console.error('Get wallet error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch wallet. Please try again.' },
      { status: 500 }
    );
  }
}
