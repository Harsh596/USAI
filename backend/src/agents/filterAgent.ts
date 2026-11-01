import { StructuredFilterCriteria } from '../models/types';
import { LocationService } from '../services/location.service';
import { TaxonomyService } from '../services/taxonomy.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export interface FilterInterpretationResult {
  structured_criteria: StructuredFilterCriteria & {
    city_ids?: string[];
    state_id?: string;
    category_ids?: string[];
    only_online?: boolean;
    include_online?: boolean;
    experience_levels?: string[];
  };
  keywords: string[];
  search_text: string;
  explanation: string;
  smart_advice?: string;
  applied_tags: string[];
  suggested_name: string;
  llm_used: boolean;
  model: string;
}

export class FilterAgent {
  private apiKey: string;
  // Multi-model resilience: Latest generation flash-lite has generous quota and high speed
  private modelCandidates = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];

  constructor() {
    this.apiKey = process.env.LLM_API_KEY || '';
  }

  /**
   * Interprets natural language user instructions using Gemini 3.5 Flash-Lite / 2.5 Flash
   * with advanced semantic extraction and constraint grounding.
   */
  async interpretNaturalQuery(query: string): Promise<FilterInterpretationResult> {
    const rawKey = process.env.LLM_API_KEY || this.apiKey;

    // Use heuristic fallback in unit test environments unless explicitly testing live LLM
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_LIVE_LLM) {
      return this.fallbackHeuristic(query);
    }

    if (rawKey && rawKey.trim().length > 0) {
      for (const model of this.modelCandidates) {
        try {
          const geminiResult = await this.callGemini(query, rawKey, model);
          if (geminiResult) {
            return geminiResult;
          }
        } catch (err: any) {
          console.warn(`[FilterAgent] Model ${model} note: ${err.message}. Trying next candidate.`);
        }
      }
    }

    // High-performance heuristic fallback
    return this.fallbackHeuristic(query);
  }

  /**
   * Direct LLM call to Google Gemini with strict constraint grounding
   */
  private async callGemini(query: string, apiKey: string, modelName: string): Promise<FilterInterpretationResult | null> {
    const prompt = `
You are the principal search intelligence engine for USAI, an elite event discovery platform.
Convert the user's natural language request into high-precision search criteria.

CRITICAL RULES:
1. DO NOT HALLUCINATE NEGATIVE CONSTRAINTS:
   - Only set "free_only: true" if user EXPLICITLY requested "free", "no cost", "0 fee", or "exclude paid".
   - Only set "only_online: true" if user EXPLICITLY requested "only online", "virtual only", or "remote only".
   - If user asks for "beginner friendly" or "hackathons with prizes", DO NOT set free_only to true!
2. EXTRACT CONCISE SEARCH KEYWORDS:
   - Provide 2 to 4 high-relevance technical tokens (e.g. ["drone", "robotics"] or ["ctf", "security"]).
   - DO NOT output a paragraph of 10 generic synonyms (like "competition", "challenge", "gathering", "novice").
3. ACCURATELY MAP TO VALID TAXONOMY CATEGORIES:
   - "ai-research" (Transformer papers, novel architectures, loss functions, arXiv preprints)
   - "cp-hackathon" (Competitive programming, DSA, algorithms, ICPC, dynamic programming)
   - "ctf-cybersecurity" (CTF, ethical hacking, pwn, reverse engineering, cryptography)
   - "engineer-hackathon" (Full stack application engineering, web/mobile app, MVP shipping)
   - "robot-hackathon" (Robotics, ROS, mechatronics, Arduino, hardware, microcontrollers)
   - "drone-uav-hackathon" (Autonomous drones, UAV, quadcopter, PX4, aerial computer vision)
   - "web3-blockchain" (Smart contracts, Solidity, DeFi, crypto, Web3)
   - "fintech" (Payments, banking, UPI, fraud detection)
   - "healthtech" (Healthcare, medical devices, clinical bio)
   - "open-source" (FOSS, open source contribution, public GitHub repos)

User Query: "${query}"

Return a valid JSON object matching this schema:
{
  "keywords": string[], // 2 to 4 concise search keywords
  "category_ids": string[], // matching IDs from list above
  "cities": string[], // Canonical city names mentioned, e.g. ["Bengaluru", "Mumbai", "Delhi"]
  "states": string[], // Mentioned states, e.g. ["Karnataka", "Maharashtra"]
  "only_online": boolean, // ONLY true if user explicitly said online-only
  "include_online": boolean, // true if user query is flexible or mentions online
  "free_only": boolean, // ONLY true if user explicitly said free
  "has_prize_money": boolean, // true if user mentioned prizes, cash, bounties, awards
  "experience_levels": string[], // ["BEGINNER", "STUDENT", "ALL"] if beginner/student mentioned
  "team_size": { "min": number | null, "max": number | null },
  "explanation": string, // One clear sentence explaining what was understood
  "smart_advice": string // One actionable suggestion for this search
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[FilterAgent] ${modelName} HTTP ${res.status}: ${err}`);
      return null;
    }

    const data = (await res.json()) as any;
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);

    // Resolve cities into canonical city_ids
    const cityIds: string[] = [];
    const resolvedCities: string[] = [];
    if (Array.isArray(parsed.cities)) {
      for (const c of parsed.cities) {
        const resLoc = LocationService.resolveLocation(c);
        if (resLoc.cityId) {
          cityIds.push(resLoc.cityId);
          if (resLoc.cityName) resolvedCities.push(resLoc.cityName);
        } else {
          resolvedCities.push(c);
        }
      }
    }

    // Resolve states into state_id
    let stateId: string | undefined = undefined;
    if (Array.isArray(parsed.states) && parsed.states.length > 0) {
      const resState = LocationService.resolveLocation(parsed.states[0]);
      if (resState.stateId) stateId = resState.stateId;
    }

    const appliedTags: string[] = [];
    if (parsed.free_only) appliedTags.push('Free Only');
    if (parsed.has_prize_money) appliedTags.push('Cash Prizes');
    if (parsed.only_online) appliedTags.push('Online Only');
    if (resolvedCities.length > 0) appliedTags.push(`City: ${resolvedCities.join(', ')}`);
    if (parsed.category_ids?.length > 0) appliedTags.push(`Tracks: ${parsed.category_ids.join(', ')}`);
    if (parsed.experience_levels?.length > 0) appliedTags.push('Beginner Friendly');
    if (parsed.team_size?.min || parsed.team_size?.max) {
      appliedTags.push(`Team: ${parsed.team_size?.min || 1}-${parsed.team_size?.max || '+'}`);
    }

    const keywords: string[] = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    // Keep search text clean and concise
    const searchText = keywords.slice(0, 3).join(' ');

    const structured_criteria: StructuredFilterCriteria & {
      city_ids?: string[];
      state_id?: string;
      category_ids?: string[];
      only_online?: boolean;
      include_online?: boolean;
      experience_levels?: string[];
    } = {
      price: parsed.free_only ? { free_only: true, max: 0, currency: 'INR' } : undefined,
      has_prize_money: parsed.has_prize_money || false,
      locations: {
        cities: resolvedCities,
        only_online: parsed.only_online || false,
        include_online: parsed.include_online || false
      },
      city_ids: cityIds.length > 0 ? cityIds : undefined,
      state_id: stateId,
      category_ids: Array.isArray(parsed.category_ids) && parsed.category_ids.length > 0 ? parsed.category_ids : undefined,
      only_online: parsed.only_online || false,
      include_online: parsed.include_online || false,
      experience_levels: Array.isArray(parsed.experience_levels) ? parsed.experience_levels : undefined,
      team_size: parsed.team_size?.min !== null || parsed.team_size?.max !== null ? {
        min: parsed.team_size?.min ?? undefined,
        max: parsed.team_size?.max ?? undefined
      } : undefined
    };

    return {
      structured_criteria,
      keywords,
      search_text: searchText,
      explanation: parsed.explanation || `Filtered for ${keywords.join(', ')}`,
      smart_advice: parsed.smart_advice || 'Ranked by semantic match relevance score.',
      applied_tags: appliedTags,
      suggested_name: `${resolvedCities[0] || (parsed.only_online ? 'Online' : 'All')} ${keywords[0] || 'AI'} Filter`,
      llm_used: true,
      model: modelName
    };
  }

  /**
   * Deterministic rule engine fallback
   */
  fallbackHeuristic(query: string): FilterInterpretationResult {
    const q = query.toLowerCase();
    const criteria: StructuredFilterCriteria = {};
    const appliedTags: string[] = [];
    const keywords: string[] = [];

    // Categories
    const categoryIds: string[] = [];
    if (q.includes('drone') || q.includes('uav')) {
      categoryIds.push('drone-uav-hackathon');
      appliedTags.push('Drone / UAV');
      keywords.push('drone');
    }
    if (q.includes('robot') || q.includes('robotics')) {
      categoryIds.push('robot-hackathon');
      appliedTags.push('Robotics');
      keywords.push('robot');
    }
    if (q.includes('ctf') || q.includes('cybersecurity') || q.includes('hacking')) {
      categoryIds.push('ctf-cybersecurity');
      appliedTags.push('CTF / Security');
      keywords.push('ctf');
    }
    if (q.includes('cp') || q.includes('competitive programming') || q.includes('algorithmic')) {
      categoryIds.push('cp-hackathon');
      appliedTags.push('Competitive Programming');
      keywords.push('algorithms');
    }
    if (q.includes('web3') || q.includes('blockchain') || q.includes('crypto')) {
      categoryIds.push('web3-blockchain');
      appliedTags.push('Web3');
      keywords.push('web3');
    }
    if (q.includes('ai') || q.includes('agent') || q.includes('machine learning')) {
      keywords.push('ai');
      appliedTags.push('AI');
    }

    // Locations & Online
    const isOnline = q.includes('online') || q.includes('remote') || q.includes('virtual');
    const isOnlyOnline = q.includes('only online') || q.includes('strictly online');

    const cityIds: string[] = [];
    const cities: string[] = [];
    if (q.includes('bengaluru') || q.includes('bangalore')) {
      cityIds.push('city-blr');
      cities.push('Bengaluru');
    }
    if (q.includes('delhi') || q.includes('noida') || q.includes('gurugram')) {
      cityIds.push('city-del');
      cities.push('Delhi');
    }
    if (q.includes('mumbai')) {
      cityIds.push('city-mum');
      cities.push('Mumbai');
    }

    if (isOnlyOnline) {
      appliedTags.push('Online Only');
    } else if (cities.length > 0) {
      appliedTags.push(`City: ${cities.join(', ')}`);
    }

    // Price
    let freeOnly = false;
    if (q.includes('free') || q.includes('exclude paid') || q.includes('no cost')) {
      freeOnly = true;
      appliedTags.push('Free Only');
    }

    // Prizes
    let hasPrizeMoney = false;
    if (q.includes('prize') || q.includes('cash') || q.includes('bounty') || q.includes('reward')) {
      hasPrizeMoney = true;
      appliedTags.push('Has Prize Pool');
    }

    // Beginner / Experience
    const isBeginner = q.includes('beginner') || q.includes('student') || q.includes('novice');
    if (isBeginner) {
      appliedTags.push('Beginner Friendly');
    }

    // Team Size
    const teamMatch = q.match(/(?:team size of at least|team >=|team of)\s*(\d+)/i);
    const minTeam = teamMatch ? parseInt(teamMatch[1], 10) : undefined;

    return {
      structured_criteria: {
        price: freeOnly ? { free_only: true, max: 0, currency: 'INR' } : undefined,
        has_prize_money: hasPrizeMoney,
        locations: {
          cities,
          only_online: isOnlyOnline,
          include_online: isOnline
        },
        city_ids: cityIds.length > 0 ? cityIds : undefined,
        category_ids: categoryIds.length > 0 ? categoryIds : undefined,
        only_online: isOnlyOnline,
        include_online: isOnline,
        experience_levels: isBeginner ? ['BEGINNER', 'ALL'] : undefined,
        team_size: minTeam ? { min: minTeam } : undefined
      },
      keywords: keywords.length > 0 ? keywords : ['hackathon'],
      search_text: keywords.join(' '),
      explanation: `Parsed criteria: ${appliedTags.join(' • ')}`,
      smart_advice: 'Showing results ranked by semantic relevance.',
      applied_tags: appliedTags,
      suggested_name: `${cities[0] || 'Filter'} (${keywords[0] || 'Event'})`,
      llm_used: false,
      model: 'rule-fallback'
    };
  }
}

export const filterAgent = new FilterAgent();
