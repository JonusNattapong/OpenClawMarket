import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { Category, ListingStatus } from '@prisma/client';
import { sanitizeInput, isValidTitle, isValidDescription, isValidAmount, isValidUrl } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/listings - Get all active listings
export async function GET(req: NextRequest) {
  // Rate limiting - NEW: Added to prevent DoS attacks
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0); // Min 0

    // Build where clause
    const where: {
      status: ListingStatus;
      category?: Category;
      OR?: Array<{ title?: { contains: string }; description?: { contains: string }; tags?: { contains: string } }>;
    } = {
      status: 'ACTIVE' as ListingStatus,
    };

    if (category && category !== 'All') {
      where.category = category.toUpperCase() as Category;
    }

    // FIXED: Sanitize search input to prevent injection
    if (search) {
      const sanitizedSearch = sanitizeInput(search).slice(0, 100); // Limit length
      if (sanitizedSearch) {
        where.OR = [
          { title: { contains: sanitizedSearch } },
          { description: { contains: sanitizedSearch } },
          { tags: { contains: sanitizedSearch } },
        ];
      }
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            reputation: true,
            verified: true,
          },
        },
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    const total = await prisma.listing.count({ where });

    // Transform to expected format
    const formattedListings = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      category: listing.category.charAt(0) + listing.category.slice(1).toLowerCase(),
      tags: JSON.parse(listing.tags || '[]'),
      imageUrl: listing.imageUrl,
      seller: {
        id: listing.seller.id,
        name: listing.seller.name,
        reputation: listing.seller.reputation,
        verified: listing.seller.verified,
      },
      purchaseCount: listing._count.purchases,
      createdAt: listing.createdAt.toISOString(),
    }));

    return NextResponse.json({
      listings: formattedListings,
      total,
      hasMore: offset + listings.length < total,
    });
  } catch (error) {
    console.error('Get listings error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch listings. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/listings - Create new listing
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

    const { title, description, price, category, tags, imageUrl } = await req.json();

    // Sanitize inputs
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedImageUrl = imageUrl ? sanitizeInput(imageUrl) : null;

    // Validation
    if (!isValidTitle(sanitizedTitle)) {
      return NextResponse.json({ error: 'Title must be 5-200 characters' }, { status: 400 });
    }
    if (!isValidDescription(sanitizedDescription)) {
      return NextResponse.json({ error: 'Description must be 20-5000 characters' }, { status: 400 });
    }
    if (!isValidAmount(price)) {
      return NextResponse.json({ error: 'Price must be a positive number (max 1,000,000)' }, { status: 400 });
    }
    if (sanitizedImageUrl && !isValidUrl(sanitizedImageUrl)) {
      return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 });
    }

    const validCategories = ['KNOWLEDGE', 'SERVICE', 'COMPUTE', 'ART', 'ACCESS', 'DATA'];
    const upperCategory = (category || 'SERVICE').toUpperCase();
    if (!validCategories.includes(upperCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const listing = await prisma.listing.create({
      data: {
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: parseFloat(price),
        category: upperCategory as 'KNOWLEDGE' | 'SERVICE' | 'COMPUTE' | 'ART' | 'ACCESS' | 'DATA',
        tags: JSON.stringify(tags || []),
        imageUrl: sanitizedImageUrl,
        sellerId: user.id,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            reputation: true,
            verified: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category.charAt(0) + listing.category.slice(1).toLowerCase(),
        tags: JSON.parse(listing.tags),
        seller: listing.seller,
        createdAt: listing.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create listing error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to create listing. Please try again.' },
      { status: 500 }
    );
  }
}
