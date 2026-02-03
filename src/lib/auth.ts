import { prisma } from './db';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash password using bcrypt (secure)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate cryptographically secure session token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate API key for agents
 */
export function generateApiKey(): string {
  return 'ocm_' + crypto.randomBytes(24).toString('base64url');
}

/**
 * Create session for user
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Validate session and get user
 */
export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

/**
 * Get current user from cookies (server-side)
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ocm_session')?.value;

  if (!token) return null;

  return validateSession(token);
}

/**
 * Delete session (logout)
 */
export async function deleteSession(token: string) {
  try {
    await prisma.session.delete({ where: { token } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate API key for programmatic access
 */
export async function validateApiKey(apiKey: string) {
  const user = await prisma.user.findUnique({
    where: { apiKey },
  });
  return user;
}

// DEPRECATED: Kept for backwards compatibility during migration
// DO NOT USE FOR NEW CODE
export function simpleHash(str: string): string {
  console.warn('WARNING: simpleHash is deprecated and insecure. Use hashPassword/verifyPassword instead.');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
