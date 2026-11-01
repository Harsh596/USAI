import { db } from '../db/database';

export interface CategorySignalDefinition {
  categoryId: string;
  name: string;
  primarySignals: { phrase: string; weight: number }[];
  contextSignals: { phrase: string; weight: number }[];
  negativeSignals?: { phrase: string; penalty: number }[];
}

export interface ClassificationResult {
  eventId: string;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];
  confidence: number;
  signals: {
    matchedCategory: string;
    phrase: string;
    weight: number;
    sourceField: string;
  }[];
  reasoningSummary: string;
  classificationStatus: 'CLASSIFIED' | 'NEEDS_REVIEW' | 'UNCLASSIFIED';
  classifiedAt: string;
}

export class ClassificationEngine {
  private static signalDefinitions: CategorySignalDefinition[] = [
    {
      categoryId: 'ctf-cybersecurity',
      name: 'CTF Hackathon',
      primarySignals: [
        { phrase: 'capture the flag', weight: 4.0 },
        { phrase: 'ctf', weight: 3.5 },
        { phrase: 'ethical hacking', weight: 3.5 },
        { phrase: 'binary exploitation', weight: 3.5 },
        { phrase: 'reverse engineering', weight: 3.0 },
        { phrase: 'cryptography challenge', weight: 3.0 },
        { phrase: 'infosec', weight: 2.5 },
        { phrase: 'cybersecurity', weight: 2.5 },
        { phrase: 'cyber security', weight: 2.5 },
        { phrase: 'penetration testing', weight: 3.0 },
        { phrase: 'red team', weight: 3.0 },
        { phrase: 'blue team', weight: 3.0 },
        { phrase: 'pwn', weight: 3.0 }
      ],
      contextSignals: [
        { phrase: 'vulnerability', weight: 1.5 },
        { phrase: 'forensics', weight: 1.5 },
        { phrase: 'network defense', weight: 1.5 },
        { phrase: 'security track', weight: 1.5 }
      ]
    },
    {
      categoryId: 'cp-hackathon',
      name: 'CP Hackathon',
      primarySignals: [
        { phrase: 'competitive programming', weight: 4.0 },
        { phrase: 'icpc', weight: 4.0 },
        { phrase: 'algorithmic contest', weight: 3.5 },
        { phrase: 'codeforces', weight: 3.5 },
        { phrase: 'leetcode style', weight: 3.0 },
        { phrase: 'data structures and algorithms', weight: 3.0 },
        { phrase: 'dsa competition', weight: 3.0 },
        { phrase: 'dynamic programming', weight: 2.5 },
        { phrase: 'time complexity', weight: 2.5 }
      ],
      contextSignals: [
        { phrase: 'test cases', weight: 1.5 },
        { phrase: 'hidden inputs', weight: 1.5 },
        { phrase: 'leaderboard by solve time', weight: 2.0 },
        { phrase: 'algorithm design', weight: 1.5 }
      ]
    },
    {
      categoryId: 'drone-uav-hackathon',
      name: 'Drone Hackathon',
      primarySignals: [
        { phrase: 'unmanned aerial vehicle', weight: 4.0 },
        { phrase: 'uav', weight: 3.5 },
        { phrase: 'drone hackathon', weight: 4.0 },
        { phrase: 'quadcopter', weight: 3.5 },
        { phrase: 'flight controller', weight: 3.0 },
        { phrase: 'px4', weight: 3.5 },
        { phrase: 'ardupilot', weight: 3.5 },
        { phrase: 'aerial navigation', weight: 3.0 },
        { phrase: 'drone vision', weight: 3.0 },
        { phrase: 'drone racing', weight: 3.5 }
      ],
      contextSignals: [
        { phrase: 'drone', weight: 2.0 },
        { phrase: 'drones', weight: 2.0 },
        { phrase: 'aerial survey', weight: 1.5 },
        { phrase: 'payload', weight: 1.5 },
        { phrase: 'waypoint', weight: 1.5 }
      ]
    },
    {
      categoryId: 'robot-hackathon',
      name: 'Robot Hackathon',
      primarySignals: [
        { phrase: 'robotics hackathon', weight: 4.0 },
        { phrase: 'robot hackathon', weight: 4.0 },
        { phrase: 'ros2', weight: 3.5 },
        { phrase: 'ros ', weight: 3.0 },
        { phrase: 'mechatronics', weight: 3.5 },
        { phrase: 'autonomous robot', weight: 3.5 },
        { phrase: 'robotic arm', weight: 3.0 },
        { phrase: 'line follower', weight: 3.0 },
        { phrase: 'robosoccer', weight: 3.5 }
      ],
      contextSignals: [
        { phrase: 'robotics', weight: 2.0 },
        { phrase: 'arduino', weight: 1.5 },
        { phrase: 'microcontroller', weight: 1.5 },
        { phrase: 'actuator', weight: 1.5 },
        { phrase: 'sensor fusion', weight: 1.5 },
        { phrase: 'hardware prototype', weight: 1.5 }
      ]
    },
    {
      categoryId: 'ai-research',
      name: 'AI Research',
      primarySignals: [
        { phrase: 'arxiv preprint', weight: 4.0 },
        { phrase: 'novel architecture', weight: 3.5 },
        { phrase: 'loss function', weight: 3.5 },
        { phrase: 'paper reproduction', weight: 3.5 },
        { phrase: 'ablation study', weight: 3.5 },
        { phrase: 'transformer architecture', weight: 3.0 },
        { phrase: 'benchmark evaluation harness', weight: 3.0 },
        { phrase: 'model weights training from scratch', weight: 3.5 },
        { phrase: 'scientific ai paper', weight: 3.5 }
      ],
      contextSignals: [
        { phrase: 'neural network research', weight: 2.0 },
        { phrase: 'gradient descent optimization', weight: 2.0 },
        { phrase: 'finetuning loss', weight: 1.5 }
      ],
      // Severe penalty if it's just building an AI app with an API
      negativeSignals: [
        { phrase: 'build an app using openai api', penalty: 3.0 },
        { phrase: 'use chatgpt api to build a tool', penalty: 3.0 },
        { phrase: 'mvp prototype using gemini', penalty: 2.5 }
      ]
    },
    {
      categoryId: 'engineer-hackathon',
      name: 'Engineer Hackathon',
      primarySignals: [
        { phrase: 'software engineering hackathon', weight: 3.5 },
        { phrase: 'full stack hackathon', weight: 3.5 },
        { phrase: 'build an application', weight: 3.0 },
        { phrase: 'web development hackathon', weight: 3.0 },
        { phrase: 'mobile app hackathon', weight: 3.0 },
        { phrase: 'production mvp', weight: 2.5 },
        { phrase: 'developer tools', weight: 2.5 },
        { phrase: 'cloud native architecture', weight: 2.5 },
        { phrase: 'api development', weight: 2.5 }
      ],
      contextSignals: [
        { phrase: 'frontend', weight: 1.0 },
        { phrase: 'backend', weight: 1.0 },
        { phrase: 'fullstack', weight: 1.0 },
        { phrase: 'react', weight: 1.0 },
        { phrase: 'node.js', weight: 1.0 },
        { phrase: 'database design', weight: 1.0 },
        { phrase: 'build and ship', weight: 1.5 }
      ]
    },
    {
      categoryId: 'web3-blockchain',
      name: 'Web3 & Blockchain',
      primarySignals: [
        { phrase: 'blockchain hackathon', weight: 4.0 },
        { phrase: 'web3 hackathon', weight: 4.0 },
        { phrase: 'smart contract', weight: 3.5 },
        { phrase: 'solidity', weight: 3.5 },
        { phrase: 'ethereum', weight: 3.0 },
        { phrase: 'solana', weight: 3.0 },
        { phrase: 'defi protocol', weight: 3.0 },
        { phrase: 'zk-proof', weight: 3.0 },
        { phrase: 'dao governance', weight: 2.5 }
      ],
      contextSignals: [
        { phrase: 'crypto', weight: 1.5 },
        { phrase: 'token', weight: 1.0 },
        { phrase: 'wallet', weight: 1.0 },
        { phrase: 'decentralized', weight: 1.5 }
      ]
    },
    {
      categoryId: 'fintech',
      name: 'Fintech & Payments',
      primarySignals: [
        { phrase: 'fintech hackathon', weight: 4.0 },
        { phrase: 'financial technology', weight: 3.5 },
        { phrase: 'payment gateway', weight: 3.0 },
        { phrase: 'upi integration', weight: 3.0 },
        { phrase: 'algorithmic trading', weight: 3.0 },
        { phrase: 'fraud detection in banking', weight: 3.0 }
      ],
      contextSignals: [
        { phrase: 'banking', weight: 1.5 },
        { phrase: 'payments', weight: 1.5 },
        { phrase: 'lending', weight: 1.5 },
        { phrase: 'neobank', weight: 1.5 }
      ]
    },
    {
      categoryId: 'healthtech',
      name: 'Healthtech & MedTech',
      primarySignals: [
        { phrase: 'healthtech hackathon', weight: 4.0 },
        { phrase: 'medtech hackathon', weight: 4.0 },
        { phrase: 'healthcare software', weight: 3.5 },
        { phrase: 'clinical diagnostics', weight: 3.5 },
        { phrase: 'medical device', weight: 3.0 },
        { phrase: 'biomedical innovation', weight: 3.0 }
      ],
      contextSignals: [
        { phrase: 'patient care', weight: 1.5 },
        { phrase: 'hospital', weight: 1.5 },
        { phrase: 'health records', weight: 1.5 }
      ]
    },
    {
      categoryId: 'open-source',
      name: 'Open Source',
      primarySignals: [
        { phrase: 'open source hackathon', weight: 4.0 },
        { phrase: 'foss hackathon', weight: 4.0 },
        { phrase: 'open source contribution', weight: 3.5 },
        { phrase: 'github pull requests', weight: 3.0 },
        { phrase: 'public repository', weight: 2.5 }
      ],
      contextSignals: [
        { phrase: 'open-source', weight: 1.5 },
        { phrase: 'foss', weight: 1.5 },
        { phrase: 'maintainer', weight: 1.5 }
      ]
    }
  ];

  /**
   * Classify an event given its full context:
   * Title, summary, description, tracks, deliverables, requirements
   */
  static classifyEvent(eventData: {
    eventId: string;
    title: string;
    description?: string;
    shortSummary?: string;
    themes?: string[];
    tags?: string[];
    technologies?: string[];
    deliverables?: string[];
    submissionRequirements?: string[];
  }): ClassificationResult {
    const titleText = (eventData.title || '').toLowerCase();
    const summaryText = (eventData.shortSummary || '').toLowerCase();
    const descText = (eventData.description || '').toLowerCase();
    const themesText = (eventData.themes || []).join(' ').toLowerCase();
    const tagsText = (eventData.tags || []).join(' ').toLowerCase();
    const techText = (eventData.technologies || []).join(' ').toLowerCase();
    const deliverablesText = (eventData.deliverables || []).join(' ').toLowerCase();
    const reqsText = (eventData.submissionRequirements || []).join(' ').toLowerCase();

    // Field multipliers: Title carries highest weight, then themes/deliverables, then full desc
    const fieldWeights: Array<{ text: string; multiplier: number; name: string }> = [
      { text: titleText, multiplier: 3.5, name: 'Title' },
      { text: themesText, multiplier: 2.5, name: 'Themes/Tracks' },
      { text: deliverablesText, multiplier: 2.5, name: 'Deliverables' },
      { text: reqsText, multiplier: 2.0, name: 'Requirements' },
      { text: techText, multiplier: 1.5, name: 'Technologies' },
      { text: summaryText, multiplier: 1.8, name: 'Summary' },
      { text: descText, multiplier: 1.0, name: 'Description' }
    ];

    const categoryScores: Record<string, {
      score: number;
      signals: Array<{ phrase: string; weight: number; sourceField: string }>;
      name: string;
    }> = {};

    for (const def of this.signalDefinitions) {
      categoryScores[def.categoryId] = {
        score: 0,
        signals: [],
        name: def.name
      };

      // 1. Evaluate Primary Signals
      for (const sig of def.primarySignals) {
        for (const field of fieldWeights) {
          if (field.text.includes(sig.phrase.toLowerCase())) {
            const added = sig.weight * field.multiplier;
            categoryScores[def.categoryId].score += added;
            categoryScores[def.categoryId].signals.push({
              phrase: sig.phrase,
              weight: added,
              sourceField: field.name
            });
            break; // Count once per signal to avoid runaway repetition
          }
        }
      }

      // 2. Evaluate Context Signals
      for (const sig of def.contextSignals) {
        for (const field of fieldWeights) {
          if (field.text.includes(sig.phrase.toLowerCase())) {
            const added = sig.weight * (field.multiplier * 0.7);
            categoryScores[def.categoryId].score += added;
            categoryScores[def.categoryId].signals.push({
              phrase: sig.phrase,
              weight: added,
              sourceField: field.name
            });
            break;
          }
        }
      }

      // 3. Evaluate Negative Penalties
      if (def.negativeSignals) {
        for (const neg of def.negativeSignals) {
          for (const field of fieldWeights) {
            if (field.text.includes(neg.phrase.toLowerCase())) {
              categoryScores[def.categoryId].score = Math.max(0, categoryScores[def.categoryId].score - (neg.penalty * field.multiplier));
              break;
            }
          }
        }
      }
    }

    // Rank categories
    const sorted = Object.entries(categoryScores)
      .map(([catId, data]) => ({ catId, ...data }))
      .sort((a, b) => b.score - a.score);

    const top = sorted[0];
    const second = sorted[1];

    // Uncertainty handling:
    // If top score is very low, mark as UNCLASSIFIED or fallback to general Engineer Hackathon with NEEDS_REVIEW
    let primaryCategoryId = top && top.score > 3.0 ? top.catId : 'engineer-hackathon';
    let status: 'CLASSIFIED' | 'NEEDS_REVIEW' | 'UNCLASSIFIED' = 'CLASSIFIED';
    let confidence = 0.5;

    if (!top || top.score < 2.5) {
      status = 'UNCLASSIFIED';
      confidence = 0.25;
      primaryCategoryId = 'engineer-hackathon'; // Neutral baseline
    } else if (top.score < 5.0 || (second && top.score - second.score < 1.0)) {
      status = 'NEEDS_REVIEW';
      confidence = Math.min(0.65, top.score / 10.0);
    } else {
      status = 'CLASSIFIED';
      confidence = Math.min(0.98, 0.65 + (top.score / 25.0));
    }

    // Secondary categories: score at least 3.0 and distinct from primary
    const secondaryCategoryIds = sorted
      .filter(s => s.catId !== primaryCategoryId && s.score >= 3.0)
      .slice(0, 3)
      .map(s => s.catId);

    // Human-readable reasoning summary
    const matchedCategoryName = categoryScores[primaryCategoryId]?.name || 'Engineer Hackathon';
    const topSignals = categoryScores[primaryCategoryId]?.signals.slice(0, 4) || [];
    const reasoningSummary = topSignals.length > 0
      ? `Classified as ${matchedCategoryName} (confidence: ${(confidence * 100).toFixed(0)}%) based on signals in ${topSignals.map(s => `"${s.phrase}" (${s.sourceField})`).join(', ')}.`
      : `Uncertain primary track; assigned to ${matchedCategoryName} with status ${status} pending manual review.`;

    const allSignals = (categoryScores[primaryCategoryId]?.signals || []).map(s => ({
      matchedCategory: primaryCategoryId,
      phrase: s.phrase,
      weight: s.weight,
      sourceField: s.sourceField
    }));

    return {
      eventId: eventData.eventId,
      primaryCategoryId,
      secondaryCategoryIds,
      confidence: Math.round(confidence * 100) / 100,
      signals: allSignals,
      reasoningSummary,
      classificationStatus: status,
      classifiedAt: new Date().toISOString()
    };
  }

  /**
   * Reclassify all events in the database using the multi-signal engine
   * and update `event_classifications` as well as canonical `events.categories`
   */
  static reclassifyAllEvents(): { total: number; classified: number; breakdown: Record<string, number> } {
    const events = db.prepare(`
      SELECT 
        event_id, 
        canonical_title, 
        description, 
        short_summary, 
        themes, 
        tags, 
        technologies, 
        deliverables, 
        submission_requirements 
      FROM events
    `).all() as Array<{
      event_id: string;
      canonical_title: string;
      description?: string;
      short_summary?: string;
      themes?: string;
      tags?: string;
      technologies?: string;
      deliverables?: string;
      submission_requirements?: string;
    }>;

    const breakdown: Record<string, number> = {};

    const upsertClassification = db.prepare(`
      INSERT OR REPLACE INTO event_classifications (
        id,
        event_id,
        primary_category_id,
        secondary_category_ids,
        confidence,
        signals,
        reasoning_summary,
        classification_status,
        classified_at,
        model_or_rule
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateEventCategory = db.prepare(`
      UPDATE events
      SET 
        categories = ?
      WHERE event_id = ?
    `);

    for (const ev of events) {
      const themes = JSON.parse(ev.themes || '[]');
      const tags = JSON.parse(ev.tags || '[]');
      const technologies = JSON.parse(ev.technologies || '[]');
      const deliverables = JSON.parse(ev.deliverables || '[]');
      const submissionRequirements = JSON.parse(ev.submission_requirements || '[]');

      const result = this.classifyEvent({
        eventId: ev.event_id,
        title: ev.canonical_title,
        description: ev.description,
        shortSummary: ev.short_summary,
        themes,
        tags,
        technologies,
        deliverables,
        submissionRequirements
      });

      // Fetch primary category display name
      const primaryCatRow = db.prepare(`SELECT name FROM categories WHERE category_id = ?`).get(result.primaryCategoryId) as { name: string } | undefined;
      const primaryName = primaryCatRow ? primaryCatRow.name : result.primaryCategoryId;

      const secondaryNames: string[] = [];
      for (const sId of result.secondaryCategoryIds) {
        const sRow = db.prepare(`SELECT name FROM categories WHERE category_id = ?`).get(sId) as { name: string } | undefined;
        if (sRow) secondaryNames.push(sRow.name);
      }

      // Store in event_classifications
      upsertClassification.run(
        `class-${ev.event_id}`,
        ev.event_id,
        result.primaryCategoryId,
        JSON.stringify(result.secondaryCategoryIds),
        result.confidence,
        JSON.stringify(result.signals),
        result.reasoningSummary,
        result.classificationStatus,
        result.classifiedAt,
        'RULE_ENGINE_V2_MULTI_SIGNAL'
      );

      // Sync categories on event
      const finalCategories = [primaryName, ...secondaryNames];
      updateEventCategory.run(JSON.stringify(finalCategories), ev.event_id);

      breakdown[primaryName] = (breakdown[primaryName] || 0) + 1;
    }

    return {
      total: events.length,
      classified: events.length,
      breakdown
    };
  }
}

