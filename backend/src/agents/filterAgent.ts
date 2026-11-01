import { StructuredFilterCriteria } from '../models/types';

export interface FilterInterpretationResult {
  structured_criteria: StructuredFilterCriteria;
  explanation: string;
  applied_tags: string[];
  suggested_name: string;
}

export class FilterAgent {
  /**
   * Interprets natural language user instructions into a validated StructuredFilterCriteria object
   * without arbitrary SQL generation or unvalidated operations.
   */
  interpretNaturalQuery(query: string): FilterInterpretationResult {
    const q = query.toLowerCase();
    const criteria: StructuredFilterCriteria = {};
    const appliedTags: string[] = [];
    const explanations: string[] = [];

    // 1. Categories & Topics
    const categories: string[] = [];
    const topics: string[] = [];

    if (q.includes('hackathon')) {
      categories.push('Hackathon');
      appliedTags.push('Hackathons');
    }
    if (q.includes('conference') || q.includes('summit')) {
      categories.push('Conference');
      appliedTags.push('Conferences');
    }
    if (q.includes('workshop') || q.includes('bootcamp')) {
      categories.push('Workshop');
      appliedTags.push('Workshops');
    }
    if (q.includes('ctf') || q.includes('cybersecurity')) {
      categories.push('CTF');
      topics.push('Cybersecurity');
      appliedTags.push('Cybersecurity / CTF');
    }

    if (q.includes('ai') || q.includes('agent') || q.includes('genai') || q.includes('llm') || q.includes('machine learning')) {
      topics.push('AI', 'GenAI', 'AI Agents');
      appliedTags.push('AI / Agents / GenAI');
      explanations.push('Filtered for AI and Autonomous Agent technologies');
    }
    if (q.includes('web3') || q.includes('blockchain') || q.includes('crypto')) {
      topics.push('Web3', 'Blockchain');
      appliedTags.push('Web3');
    }

    if (categories.length > 0) criteria.categories = categories;
    if (topics.length > 0) criteria.topics = topics;

    // 2. Locations & Format
    const locations: { cities?: string[]; states?: string[]; include_online?: boolean; only_online?: boolean } = {};

    if (q.includes('online') || q.includes('remote') || q.includes('virtual')) {
      if (q.includes('only online') || q.includes('strictly online')) {
        locations.only_online = true;
        locations.include_online = true;
        appliedTags.push('Online Only');
        explanations.push('Restricted to online events only');
      } else {
        locations.include_online = true;
        appliedTags.push('Includes Online');
      }
    }

    const cities: string[] = [];
    if (q.includes('bengaluru') || q.includes('bangalore')) cities.push('Bengaluru');
    if (q.includes('delhi') || q.includes('noida') || q.includes('gurugram')) cities.push('Delhi');
    if (q.includes('mumbai') || q.includes('pune')) cities.push('Mumbai');
    if (q.includes('hyderabad')) cities.push('Hyderabad');

    if (cities.length > 0) {
      locations.cities = cities;
      appliedTags.push(`Location: ${cities.join(', ')}`);
      explanations.push(`Targeting cities: ${cities.join(', ')}`);
    }

    const states: string[] = [];
    if (q.includes('karnataka')) states.push('Karnataka');
    if (q.includes('maharashtra')) states.push('Maharashtra');
    if (states.length > 0) locations.states = states;

    if (Object.keys(locations).length > 0) {
      criteria.locations = locations;
    }

    // 3. Price & Exclusions
    if (q.includes('free') || q.includes('exclude paid') || q.includes('no cost') || q.includes('without fee')) {
      criteria.price = { free_only: true, max: 0, currency: 'INR' };
      appliedTags.push('Free Only');
      explanations.push('Excluding paid events (0 INR registration fee)');
    } else {
      const priceMatch = q.match(/(?:under|below|less than|max)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
      if (priceMatch) {
        const maxPrice = parseInt(priceMatch[1], 10);
        criteria.price = { max: maxPrice, currency: 'INR' };
        appliedTags.push(`Max Price: ₹${maxPrice}`);
      }
    }

    // 4. Team Size
    const teamMinMatch = q.match(/(?:team size of at least|team of at least|min team size of|team >=)\s*(\d+)/i) ||
                         q.match(/team size (\d+)\s*(?:-|to)\s*(\d+)/i);
    if (teamMinMatch) {
      const min = parseInt(teamMinMatch[1], 10);
      const max = teamMinMatch[2] ? parseInt(teamMinMatch[2], 10) : undefined;
      criteria.team_size = { min, max };
      appliedTags.push(`Team Size: ${min}${max ? '-' + max : '+'}`);
      explanations.push(`Team size requirement: ${min} ${max ? 'to ' + max : 'or more'} participants`);
    }

    // 5. Eligibility (Students, etc.)
    if (q.includes('student') || q.includes('college')) {
      criteria.eligibility = ['College Students', 'Students'];
      appliedTags.push('Student Friendly');
      explanations.push('Filtered for events allowing or dedicated to college students');
    }

    // 6. Prize Money Preference
    if (q.includes('prize') || q.includes('cash prize') || q.includes('prize pool') || q.includes('reward')) {
      criteria.has_prize_money = true;
      appliedTags.push('Has Prize Pool');
      explanations.push('Prioritizing events with verified cash or reward prize pools');
    }

    // 7. Registration Status
    if (q.includes('open') || q.includes('register now') || q.includes('accepting applications')) {
      criteria.registration_open_only = true;
      appliedTags.push('Open for Registration');
      explanations.push('Only showing events currently accepting registrations');
    }

    // Name generation
    const namePrefix = topics[0] || categories[0] || 'Custom';
    const locPrefix = cities[0] || (locations.only_online ? 'Online' : 'Global');
    const suggestedName = `${locPrefix} ${namePrefix} Filter`;

    const explanation = explanations.length > 0
      ? `Understood your filter: ${explanations.join('. ')}.`
      : 'Parsed filter criteria based on your keywords.';

    return {
      structured_criteria: criteria,
      explanation,
      applied_tags: appliedTags,
      suggested_name: suggestedName
    };
  }
}

export const filterAgent = new FilterAgent();

