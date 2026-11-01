import { MongoClient, Db } from 'mongodb';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to current dir

const DATABASE_URL = process.env.DATABASE_URL || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'usai';

let client: MongoClient | null = null;
let mongoDb: Db | null = null;
let isConnected = false;

export async function connectMongo(): Promise<Db | null> {
  if (mongoDb && isConnected) {
    return mongoDb;
  }

  if (!DATABASE_URL || (!DATABASE_URL.startsWith('mongodb://') && !DATABASE_URL.startsWith('mongodb+srv://'))) {
    console.log('[MongoDB] DATABASE_URL is not set or not a mongodb URL. Using local SQLite mode.');
    return null;
  }

  try {
    client = new MongoClient(DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    mongoDb = client.db(DB_NAME);
    isConnected = true;
    console.log(`[MongoDB] Successfully connected to MongoDB Atlas database "${DB_NAME}"`);

    // Ensure indexes for fast search & filtering
    await initMongoIndexes(mongoDb);

    return mongoDb;
  } catch (err: any) {
    console.warn(`[MongoDB] Warning: Could not connect to MongoDB Atlas (${err.message}). Falling back to SQLite mode.`);
    isConnected = false;
    mongoDb = null;
    return null;
  }
}

export function getMongoDb(): Db | null {
  return mongoDb;
}

export function isMongoConnected(): boolean {
  return isConnected;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    isConnected = false;
    mongoDb = null;
    console.log('[MongoDB] Connection closed.');
  }
}

async function initMongoIndexes(db: Db) {
  try {
    // 1. Events indexes
    await db.collection('events').createIndex({ event_id: 1 }, { unique: true });
    await db.collection('events').createIndex({ source_url: 1 }, { unique: true });
    await db.collection('events').createIndex({ city_id: 1 });
    await db.collection('events').createIndex({ state_id: 1 });
    await db.collection('events').createIndex({ attendance_format: 1 });
    await db.collection('events').createIndex({ registration_deadline: 1 });
    await db.collection('events').createIndex({ canonical_title: 'text', description: 'text' });

    // 2. Locations indexes
    await db.collection('cities').createIndex({ city_id: 1 }, { unique: true });
    await db.collection('cities').createIndex({ state_id: 1 });
    await db.collection('states').createIndex({ state_id: 1 }, { unique: true });

    // 3. Categories & Classifications indexes
    await db.collection('categories').createIndex({ category_id: 1 }, { unique: true });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    await db.collection('event_classifications').createIndex({ event_id: 1 }, { unique: true });
    await db.collection('event_classifications').createIndex({ primary_category_id: 1 });

    // 4. Proposals & Search Queries
    await db.collection('category_proposals').createIndex({ proposal_id: 1 }, { unique: true });
    await db.collection('category_proposals').createIndex({ suggested_slug: 1 }, { unique: true });
    await db.collection('category_search_queries').createIndex({ normalized_query: 1 });

    console.log('[MongoDB] Collection indexes initialized successfully.');
  } catch (e: any) {
    console.warn('[MongoDB] Index creation note:', e.message);
  }
}

