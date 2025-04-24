import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import * as mongoDBService from '@/lib/services/mongoDBService';

/**
 * GET /api/outfits
 * Get all outfits for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const outfits = await mongoDBService.getUserOutfits(userId);
    
    return NextResponse.json(outfits);
  } catch (error) {
    console.error('Error fetching outfits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outfits' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outfits
 * Add a new outfit for the authenticated user
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const outfit = await request.json();
    
    const addedOutfit = await mongoDBService.addOutfit(userId, outfit);
    
    return NextResponse.json(addedOutfit);
  } catch (error) {
    console.error('Error adding outfit:', error);
    return NextResponse.json(
      { error: 'Failed to add outfit' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outfits?id=<outfit_id>
 * Delete an outfit by ID for the authenticated user
 */
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const outfitId = searchParams.get('id');
    
    if (!outfitId) {
      return NextResponse.json(
        { error: 'Outfit ID is required' },
        { status: 400 }
      );
    }
    
    const result = await mongoDBService.deleteOutfit(userId, outfitId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Outfit not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting outfit:', error);
    return NextResponse.json(
      { error: 'Failed to delete outfit' },
      { status: 500 }
    );
  }
}