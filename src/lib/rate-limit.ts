import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

export function rateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for') ||
             req.headers.get('x-real-ip') ||
             'unknown';

  const now = Date.now();
  const key = `${ip}:${req.method}:${req.nextUrl.pathname}`;

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return null;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetIn = Math.ceil((current.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: resetIn
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString()
        }
      }
    );
  }

  current.count++;
  return null;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute