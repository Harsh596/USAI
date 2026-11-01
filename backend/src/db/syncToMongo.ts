import { db } from './database';
import { connectMongo, closeMongo } from './mongodb';

export async function syncAllDataToMongo() {
  const mongo = await connectMongo();
  if (!mongo) {
    console.error('[Sync] Cannot sync: MongoDB connection is not active.');
    return { success: false, reason: 'MongoDB connection failed' };
  }

  console.log('[Sync] Starting full synchronization from local canonical store to MongoDB Atlas...');

  // 1. Sync Countries
  const countries = db.prepare('SELECT * FROM countries').all() as any[];
  if (countries.length > 0) {
    for (const c of countries) {
      await mongo.collection('countries').updateOne(
        { country_id: c.country_id },
        { $set: c },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${countries.length} countries.`);
  }

  // 2. Sync States
  const states = db.prepare('SELECT * FROM states').all() as any[];
  if (states.length > 0) {
    for (const s of states) {
      await mongo.collection('states').updateOne(
        { state_id: s.state_id },
        { $set: s },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${states.length} states.`);
  }

  // 3. Sync Cities
  const cities = db.prepare('SELECT * FROM cities').all() as any[];
  if (cities.length > 0) {
    for (const ci of cities) {
      const doc = {
        ...ci,
        aliases: JSON.parse(ci.aliases || '[]')
      };
      await mongo.collection('cities').updateOne(
        { city_id: ci.city_id },
        { $set: doc },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${cities.length} canonical cities.`);
  }

  // 4. Sync Categories
  const categories = db.prepare('SELECT * FROM categories').all() as any[];
  if (categories.length > 0) {
    for (const cat of categories) {
      const doc = {
        ...cat,
        keywords: JSON.parse(cat.keywords || '[]'),
        signals: cat.signals ? JSON.parse(cat.signals) : null
      };
      await mongo.collection('categories').updateOne(
        { category_id: cat.category_id },
        { $set: doc },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${categories.length} categories.`);
  }

  // 5. Sync Category Aliases
  const aliases = db.prepare('SELECT * FROM category_aliases').all() as any[];
  if (aliases.length > 0) {
    for (const a of aliases) {
      await mongo.collection('category_aliases').updateOne(
        { id: a.id },
        { $set: a },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${aliases.length} category aliases.`);
  }

  // 6. Sync Events
  const events = db.prepare('SELECT * FROM events').all() as any[];
  if (events.length > 0) {
    for (const ev of events) {
      const doc = {
        ...ev,
        categories: JSON.parse(ev.categories || '[]'),
        tags: JSON.parse(ev.tags || '[]'),
        technologies: JSON.parse(ev.technologies || '[]'),
        themes: JSON.parse(ev.themes || '[]'),
        eligibility: JSON.parse(ev.eligibility || '[]'),
        target_audience: JSON.parse(ev.target_audience || '[]'),
        required_skills: JSON.parse(ev.required_skills || '[]'),
        deliverables: JSON.parse(ev.deliverables || '[]'),
        submission_requirements: JSON.parse(ev.submission_requirements || '[]'),
        event_schedule: JSON.parse(ev.event_schedule || '[]'),
        sponsors: JSON.parse(ev.sponsors || '[]'),
        synced_at: new Date().toISOString()
      };
      await mongo.collection('events').updateOne(
        { event_id: ev.event_id },
        { $set: doc },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${events.length} canonical events into MongoDB collection "events".`);
  }

  // 7. Sync Event Classifications
  const classifications = db.prepare('SELECT * FROM event_classifications').all() as any[];
  if (classifications.length > 0) {
    for (const ec of classifications) {
      const doc = {
        ...ec,
        secondary_category_ids: JSON.parse(ec.secondary_category_ids || '[]'),
        signals: JSON.parse(ec.signals || '[]')
      };
      await mongo.collection('event_classifications').updateOne(
        { id: ec.id },
        { $set: doc },
        { upsert: true }
      );
    }
    console.log(`[Sync] Synced ${classifications.length} event classifications.`);
  }

  // 8. Sync Proposals & Query Logs
  const proposals = db.prepare('SELECT * FROM category_proposals').all() as any[];
  for (const p of proposals) {
    await mongo.collection('category_proposals').updateOne(
      { suggested_slug: p.suggested_slug },
      { $set: { ...p, source_queries: JSON.parse(p.source_queries || '[]'), sample_event_ids: JSON.parse(p.sample_event_ids || '[]') } },
      { upsert: true }
    );
  }

  const queries = db.prepare('SELECT * FROM category_search_queries').all() as any[];
  for (const q of queries) {
    await mongo.collection('category_search_queries').updateOne(
      { id: q.id },
      { $set: q },
      { upsert: true }
    );
  }
  console.log(`[Sync] Synced ${proposals.length} proposals and ${queries.length} search queries.`);

  console.log('[Sync] Synchronization to MongoDB Atlas completed successfully!');
  return {
    success: true,
    stats: {
      countries: countries.length,
      states: states.length,
      cities: cities.length,
      categories: categories.length,
      events: events.length,
      classifications: classifications.length
    }
  };
}

if (require.main === module) {
  syncAllDataToMongo()
    .then(res => {
      console.log('Sync Result:', res);
      return closeMongo();
    })
    .catch(err => {
      console.error('Sync Error:', err);
      process.exit(1);
    });
}

