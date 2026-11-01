import { FilterAgent } from '../src/agents/filterAgent';
import { filterService } from '../src/services/filter.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

describe('Gemini 2.5 Flash Natural Language Filter Tests', () => {
  jest.setTimeout(45000);
  const agent = new FilterAgent();
  const hasKey = !!process.env.LLM_API_KEY;

  test('Gemini extracts search keywords, categories, and locations from natural query', async () => {
    if (!hasKey) {
      console.warn('Skipping live Gemini test: LLM_API_KEY not found');
      return;
    }

    // Force live LLM in test
    process.env.TEST_LIVE_LLM = 'true';

    const naturalQuery = 'Find me beginner friendly drone or robot hackathons in Bangalore or online with cash prizes and teams of 2 to 4';
    const result = await agent.interpretNaturalQuery(naturalQuery);

    expect(result.llm_used).toBe(true);
    expect(['gemini-3.5-flash-lite', 'gemini-2.5-flash']).toContain(result.model);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.explanation).toBeDefined();

    // Verify keyword extraction includes core terms
    const kwString = result.keywords.join(' ').toLowerCase();
    expect(kwString.includes('drone') || kwString.includes('robot')).toBe(true);

    // Verify structured criteria
    expect(result.structured_criteria.has_prize_money).toBe(true);
    expect(result.structured_criteria.include_online).toBe(true);

    // Apply the filter using both structured criteria and extracted keywords
    const filteredEvents = filterService.applyFilter(
      result.structured_criteria,
      result.search_text || result.keywords.join(' ')
    );

    expect(Array.isArray(filteredEvents)).toBe(true);
    console.log(`[Gemini Test] Extracted ${result.keywords.length} keywords: [${result.keywords.join(', ')}]`);
    console.log(`[Gemini Test] Explanation: "${result.explanation}"`);
    console.log(`[Gemini Test] Filter matched ${filteredEvents.length} events`);

    delete process.env.TEST_LIVE_LLM;
  }, 60000);
});

