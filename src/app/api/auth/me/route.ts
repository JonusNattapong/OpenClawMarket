import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/auth/me - Get current user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ocm_session')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = await validateSession(token);

    if (!user) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete('ocm_session');
      return response;
    }

    // Get user's purchases (inventory)
    const purchases: { listingId: string }[] = await prisma.purchase.findMany({
      where: { buyerId: user.id },
      select: { listingId: true },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        balance: user.balance,
        reputation: user.reputation,
        verified: user.verified,
        inventory: purchases.map((p: { listingId: string }) => p.listingId),
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null });
  }
}
