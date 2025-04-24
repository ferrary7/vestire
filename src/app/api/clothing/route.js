import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import * as mongoDBService from '@/lib/services/mongoDBService';

/**
 * GET /api/clothing
 * Get all clothing items for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const clothingItems = await mongoDBService.getUserClothingItems(userId);
    
    return NextResponse.json(clothingItems);
  } catch (error) {
    console.error('Error fetching clothing items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clothing items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clothing
 * Add a new clothing item for the authenticated user
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const item = await request.json();
    
    const addedItem = await mongoDBService.addClothingItem(userId, item);
    
    return NextResponse.json(addedItem);
  } catch (error) {
    console.error('Error adding clothing item:', error);
    return NextResponse.json(
      { error: 'Failed to add clothing item' },
      { status: 500 }
    );
  }
}