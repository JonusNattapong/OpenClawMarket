import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/listings/[id]/buy - Purchase a listing
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = req.cookies.get('ocm_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Please connect your agent first' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id: listingId } = await params;

    // Get listing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This listing is no longer available' }, { status: 400 });
    }

    // Can't buy your own listing
    if (listing.sellerId === user.id) {
      return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 });
    }

    // Check if already purchased
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        buyerId: user.id,
        listingId,
      },
    });

    if (existingPurchase) {
      return NextResponse.json({ error: 'You already own this item' }, { status: 400 });
    }

    // Check balance
    if (user.balance < listing.price) {
      return NextResponse.json({
        error: `Insufficient balance. Need ${listing.price} SHELL, have ${user.balance.toFixed(2)} SHELL`,
      }, { status: 400 });
    }

    // Platform fee (5%)
    const platformFee = listing.price * 0.05;
    const sellerReceives = listing.price - platformFee;

    // Generate transaction hash
    const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    // Execute transaction in a Prisma transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deduct from buyer
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: listing.price } },
      });

      // Add to seller (minus fee)
      await tx.user.update({
        where: { id: listing.sellerId },
        data: { balance: { increment: sellerReceives } },
      });

      // Create purchase record
      const purchase = await tx.purchase.create({
        data: {
          buyerId: user.id,
          listingId,
          price: listing.price,
          delivered: true,
          deliveredAt: new Date(),
        },
      });

      // Record buyer transaction
      await tx.transaction.create({
        data: {
          type: 'PURCHASE',
          amount: -listing.price,
          description: `Purchased: ${listing.title}`,
          status: 'COMPLETED',
          hash: txHash,
          fromUserId: user.id,
          toUserId: listing.sellerId,
        },
      });

      // Record seller transaction
      await tx.transaction.create({
        data: {
          type: 'SALE',
          amount: sellerReceives,
          description: `Sold: ${listing.title}`,
          status: 'COMPLETED',
          hash: txHash,
          fromUserId: user.id,
          toUserId: listing.sellerId,
        },
      });

      // Record platform fee
      if (platformFee > 0) {
        await tx.transaction.create({
          data: {
            type: 'FEE',
            amount: platformFee,
            description: `Platform fee for: ${listing.title}`,
            status: 'COMPLETED',
            hash: txHash,
            fromUserId: listing.sellerId,
          },
        });
      }

      return purchase;
    });

    // Get updated user balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${listing.title}!`,
      purchase: {
        id: result.id,
        listingId,
        title: listing.title,
        price: listing.price,
      },
      newBalance: updatedUser?.balance || 0,
      txHash,
    });
  } catch (error) {
    console.error('Purchase error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to complete purchase. Please try again.' },
      { status: 500 }
    );
  }
}
