import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { simpleHash, createSession } from '@/lib/auth';

// POST /api/auth/login - Login with name/password or just name for agents
export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Agent name required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { name },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check password if set
    if (user.password && password) {
      const hashedInput = simpleHash(password);
      if (hashedInput !== user.password) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
    }

    // Create session
    const token = await createSession(user.id);

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
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
