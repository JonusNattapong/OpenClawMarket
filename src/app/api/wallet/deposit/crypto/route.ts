import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { isValidAmount } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/wallet/deposit/crypto - Create crypto payment
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = req.cookies.get('ocm_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { amount, currency = 'ETH' } = await req.json();

    // Validate amount
    if (!isValidAmount(amount)) {
      return NextResponse.json({ error: 'Amount must be a positive number (max 1,000,000)' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (numAmount < 10) {
      return NextResponse.json({ error: 'Minimum crypto deposit is 10 USD equivalent' }, { status: 400 });
    }

    if (numAmount > 50000) {
      return NextResponse.json({ error: 'Maximum crypto deposit is 50,000 USD equivalent' }, { status: 400 });
    }

    // Supported currencies
    const supportedCurrencies = ['ETH', 'BTC', 'USDC', 'USDT'];
    if (!supportedCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Unsupported cryptocurrency' }, { status: 400 });
    }

    // Generate unique payment ID
    const paymentId = `crypto_${Date.now()}_${user.id.slice(-8)}`;

    // In production, integrate with Coinbase Commerce, NOWPayments, or similar
    // For now, simulate crypto payment address generation
    const cryptoAddress = generateCryptoAddress(currency);
    const expectedAmount = calculateCryptoAmount(numAmount, currency);

    // Store pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        type: 'DEPOSIT',
        amount: numAmount,
        description: `Crypto Deposit ${currency} (Pending)`,
        status: 'PENDING',
        hash: paymentId,
        toUserId: user.id,
        metadata: JSON.stringify({
          paymentMethod: 'crypto',
          currency,
          cryptoAddress,
          expectedAmount,
          paymentId,
          usdAmount: numAmount,
        }),
      },
    });

    return NextResponse.json({
      paymentId,
      transactionId: transaction.id,
      currency,
      address: cryptoAddress,
      expectedAmount,
      usdAmount: numAmount,
      qrCode: generateQRCode(cryptoAddress, expectedAmount, currency),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    });

  } catch (error) {
    console.error('Crypto payment creation error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to create crypto payment. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper functions (in production, use real crypto payment service)
function generateCryptoAddress(currency: string): string {
  // Mock addresses - in production, get from payment processor
  const addresses = {
    ETH: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    USDC: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    USDT: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  };
  return addresses[currency as keyof typeof addresses] || addresses.ETH;
}

function calculateCryptoAmount(usdAmount: number, currency: string): number {
  // Mock conversion rates - in production, get real-time rates
  const rates = {
    ETH: 1 / 2500, // ~$2500 per ETH
    BTC: 1 / 45000, // ~$45000 per BTC
    USDC: 1, // 1:1 with USD
    USDT: 1, // 1:1 with USD
  };
  return usdAmount * rates[currency as keyof typeof rates];
}

function generateQRCode(address: string, amount: number, currency: string): string {
  // In production, generate real QR code
  // For now, return a data URL or URI
  const uri = `${currency.toLowerCase()}:${address}?amount=${amount}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
}