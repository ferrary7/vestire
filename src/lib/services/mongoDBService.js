import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * MongoDB Service for clothing and outfit data
 */
export async function getMongoClient() {
  return await clientPromise;
}

/**
 * Get user clothing items from MongoDB
 */
export async function getUserClothingItems(userId) {
  const client = await getMongoClient();
  const db = client.db();
  
  const items = await db
    .collection('clothing')
    .find({ userId })
    .sort({ addedAt: -1 })
    .toArray();
    
  return items.map(item => {
    // Convert MongoDB _id to id for client compatibility
    const { _id, ...rest } = item;
    return { id: _id.toString(), ...rest };
  });
}

/**
 * Add clothing item to MongoDB
 */
export async function addClothingItem(userId, item) {
  const client = await getMongoClient();
  const db = client.db();
  
  // Add userId to the item and ensure there's an addedAt timestamp
  const itemWithUserId = {
    ...item,
    userId,
    addedAt: item.addedAt || new Date().toISOString()
  };
  
  const result = await db.collection('clothing').insertOne(itemWithUserId);
  
  return {
    id: result.insertedId.toString(),
    ...itemWithUserId
  };
}

/**
 * Update clothing item in MongoDB
 */
export async function updateClothingItem(userId, itemId, updates) {
  const client = await getMongoClient();
  const db = client.db();
  
  const { id, ...updatesWithoutId } = updates;
  
  try {
    const result = await db.collection('clothing').updateOne(
      { _id: new ObjectId(itemId), userId },
      { $set: updatesWithoutId }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating clothing item:', error);
    return false;
  }
}

/**
 * Delete clothing item from MongoDB
 */
export async function deleteClothingItem(userId, itemId) {
  const client = await getMongoClient();
  const db = client.db();
  
  try {
    const result = await db.collection('clothing').deleteOne(
      { _id: new ObjectId(itemId), userId }
    );
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting clothing item:', error);
    return false;
  }
}

/**
 * Get user outfits from MongoDB
 */
export async function getUserOutfits(userId) {
  const client = await getMongoClient();
  const db = client.db();
  
  const outfits = await db
    .collection('outfits')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
    
  return outfits.map(outfit => {
    const { _id, ...rest } = outfit;
    return { id: _id.toString(), ...rest };
  });
}

/**
 * Add outfit to MongoDB
 */
export async function addOutfit(userId, outfit) {
  const client = await getMongoClient();
  const db = client.db();
  
  const outfitWithUserId = {
    ...outfit,
    userId,
    createdAt: outfit.createdAt || new Date().toISOString()
  };
  
  const result = await db.collection('outfits').insertOne(outfitWithUserId);
  
  return {
    id: result.insertedId.toString(),
    ...outfitWithUserId
  };
}

/**
 * Update outfit in MongoDB
 */
export async function updateOutfit(userId, outfitId, updates) {
  const client = await getMongoClient();
  const db = client.db();
  
  const { id, ...updatesWithoutId } = updates;
  
  try {
    const result = await db.collection('outfits').updateOne(
      { _id: new ObjectId(outfitId), userId },
      { $set: updatesWithoutId }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating outfit:', error);
    return false;
  }
}

/**
 * Delete outfit from MongoDB
 */
export async function deleteOutfit(userId, outfitId) {
  const client = await getMongoClient();
  const db = client.db();
  
  try {
    const result = await db.collection('outfits').deleteOne(
      { _id: new ObjectId(outfitId), userId }
    );
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting outfit:', error);
    return false;
  }
}

/**
 * Save chat interaction to MongoDB
 */
export async function saveChatInteraction(userId, chatData) {
  const client = await getMongoClient();
  const db = client.db();
  
  const chatWithUserId = {
    ...chatData,
    userId,
    savedAt: new Date().toISOString()
  };
  
  try {
    const result = await db.collection('chatInteractions').insertOne(chatWithUserId);
    return {
      id: result.insertedId.toString(),
      ...chatWithUserId
    };
  } catch (error) {
    console.error('Error saving chat interaction:', error);
    return false;
  }
}

/**
 * Get user chat interactions from MongoDB
 */
export async function getUserChatInteractions(userId, limit = 20) {
  const client = await getMongoClient();
  const db = client.db();
  
  try {
    const interactions = await db
      .collection('chatInteractions')
      .find({ userId })
      .sort({ savedAt: -1 })
      .limit(limit)
      .toArray();
      
    return interactions.map(interaction => {
      const { _id, ...rest } = interaction;
      return { id: _id.toString(), ...rest };
    });
  } catch (error) {
    console.error('Error getting chat interactions:', error);
    return [];
  }
}