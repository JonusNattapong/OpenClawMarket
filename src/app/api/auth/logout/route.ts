import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

// POST /api/auth/logout
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ocm_session')?.value;

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('ocm_session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
