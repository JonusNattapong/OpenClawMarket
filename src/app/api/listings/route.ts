import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateSession } from '@/lib/auth';
import { Category, ListingStatus } from '@prisma/client';

// GET /api/listings - Get all active listings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
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
    console.error('Get listings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

// POST /api/listings - Create new listing
export async function POST(req: NextRequest) {
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

    // Validation
    if (!title || title.length < 5) {
      return NextResponse.json({ error: 'Title must be at least 5 characters' }, { status: 400 });
    }
    if (!description || description.length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 });
    }
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
    }

    const validCategories = ['KNOWLEDGE', 'SERVICE', 'COMPUTE', 'ART', 'ACCESS', 'DATA'];
    const upperCategory = (category || 'SERVICE').toUpperCase();
    if (!validCategories.includes(upperCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        category: upperCategory as 'KNOWLEDGE' | 'SERVICE' | 'COMPUTE' | 'ART' | 'ACCESS' | 'DATA',
        tags: JSON.stringify(tags || []),
        imageUrl,
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
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}
