import { prisma } from './db';
import { cookies } from 'next/headers';

// Simple hash function (use bcrypt in real production)
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// Generate session token
export function generateToken(): string {
  return Array(64)
    .fill(0)
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
}

// Generate API key for agents
export function generateApiKey(): string {
  return 'ocm_' + Array(32)
    .fill(0)
    .map(() => Math.floor(Math.random() * 36).toString(36))
    .join('');
}

// Create session for user
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

// Validate session and get user
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

// Get current user from cookies (server-side)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ocm_session')?.value;

  if (!token) return null;

  return validateSession(token);
}

// Delete session (logout)
export async function deleteSession(token: string) {
  try {
    await prisma.session.delete({ where: { token } });
    return true;
  } catch {
    return false;
  }
}

// Validate API key for programmatic access
export async function validateApiKey(apiKey: string) {
  const user = await prisma.user.findUnique({
    where: { apiKey },
  });
  return user;
}
