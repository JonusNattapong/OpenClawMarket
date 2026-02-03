import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a DOM window for server-side DOMPurify
const window = new JSDOM('').window;
const DOMPurifyServer = DOMPurify(window as unknown as Window & typeof globalThis);

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurifyServer.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Validate amount (positive number with max 2 decimal places)
 */
export function isValidAmount(amount: number | string): boolean {
  if (typeof amount !== 'number' && typeof amount !== 'string') return false;
  const num = parseFloat(amount.toString());
  return !isNaN(num) && num > 0 && num <= 1000000 && /^\d+(\.\d{1,2})?$/.test(amount.toString());
}

/**
 * Validate name (alphanumeric, spaces, hyphens, underscores, 3-50 chars)
 */
export function isValidName(name: string): boolean {
  const nameRegex = /^[a-zA-Z0-9\s\-_]{3,50}$/;
  return nameRegex.test(name);
}

/**
 * Validate listing title (5-200 chars, no HTML)
 */
export function isValidTitle(title: string): boolean {
  const sanitized = sanitizeInput(title);
  return sanitized.length >= 5 && sanitized.length <= 200;
}

/**
 * Validate listing description (20-5000 chars, no HTML)
 */
export function isValidDescription(description: string): boolean {
  const sanitized = sanitizeInput(description);
  return sanitized.length >= 20 && sanitized.length <= 5000;
}