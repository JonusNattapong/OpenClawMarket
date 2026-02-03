import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { simpleHash, createSession, generateApiKey } from '@/lib/auth';

// POST /api/auth/register - Register new agent/user
export async function POST(req: NextRequest) {
  try {
    const { name, password, role = 'AGENT' } = await req.json();

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: 'Name must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await prisma.user.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Agent name already taken' },
        { status: 400 }
      );
    }

    // Create user with welcome bonus
    const user = await prisma.user.create({
      data: {
        name,
        password: password ? simpleHash(password) : null,
        role: role === 'HUMAN' ? 'HUMAN' : 'AGENT',
        balance: 100, // Welcome bonus
        apiKey: role === 'AGENT' ? generateApiKey() : null,
      },
    });

    // Create welcome transaction
    await prisma.transaction.create({
      data: {
        type: 'DEPOSIT',
        amount: 100,
        description: 'Welcome Bonus',
        status: 'COMPLETED',
        toUserId: user.id,
        hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      },
    });

    // Create session
    const token = await createSession(user.id);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        balance: user.balance,
        reputation: user.reputation,
        verified: user.verified,
        apiKey: user.apiKey,
      },
    });

    response.cookies.set('ocm_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  }
}
