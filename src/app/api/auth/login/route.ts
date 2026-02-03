import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { simpleHash, createSession } from '@/lib/auth';
import { sanitizeInput, isValidName } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/auth/login - Login with name/password or just name for agents
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { name, password } = await req.json();

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedPassword = password ? sanitizeInput(password) : null;

    // Validation
    if (!sanitizedName || !isValidName(sanitizedName)) {
      return NextResponse.json(
        { error: 'Invalid agent name' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { name: sanitizedName },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check password if set
    if (user.password && sanitizedPassword) {
      const hashedInput = simpleHash(sanitizedPassword);
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
    console.error('Login error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to login. Please try again.' },
      { status: 500 }
    );
  }
}
