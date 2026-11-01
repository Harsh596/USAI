import dotenv from 'dotenv';
dotenv.config();

export interface TinyFishSearchResult {
  position: number;
  title: string;
  url: string;
  snippet?: string;
  site_name?: string;
  date?: string;
}

export interface TinyFishSearchResponse {
  query: string;
  results: TinyFishSearchResult[];
  total_results?: number;
  page?: number;
}

export interface TinyFishFetchItem {
  url: string;
  final_url?: string;
  title?: string;
  description?: string;
  language?: string;
  text?: string;
  author?: string | null;
  published_date?: string | null;
  latency_ms?: number;
  format?: string;
}

export interface TinyFishFetchResponse {
  results: TinyFishFetchItem[];
  errors: Array<{ url: string; error: string }>;
}

export class TinyFishService {
  private apiKey: string;
  private searchApiUrl = 'https://api.search.tinyfish.ai';
  private fetchApiUrl = 'https://api.fetch.tinyfish.ai';
  private agentApiUrl = 'https://agent.tinyfish.ai/v1/automation/run';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TINYFISH_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[TinyFishService] Warning: TINYFISH_API_KEY is not set. Live calls will fail.');
    }
  }

  /**
   * Search for public event pages
   */
  async search(query: string, options?: { location?: string; language?: string; include_domains?: string }): Promise<TinyFishSearchResult[]> {
    if (!this.apiKey) {
      console.warn('[TinyFishService] No API Key, returning empty search results');
      return [];
    }

    const params = new URLSearchParams({ query });
    if (options?.location) params.append('location', options.location);
    if (options?.language) params.append('language', options.language);

    const url = `${this.searchApiUrl}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TinyFishService] Search HTTP error ${response.status}: ${errText}`);
        return [];
      }

      const data = (await response.json()) as TinyFishSearchResponse;
      return data.results || [];
    } catch (err: any) {
      console.error('[TinyFishService] Search error:', err.message);
      return [];
    }
  }

  /**
   * Fetch contents of one or more URLs (automatically chunked into <=10 batches for TinyFish API)
   */
  async fetchContent(urls: string[]): Promise<TinyFishFetchResponse> {
    if (!this.apiKey) {
      return { results: [], errors: [{ url: urls[0] || '', error: 'API key missing' }] };
    }

    if (!urls || urls.length === 0) {
      return { results: [], errors: [] };
    }

    // TinyFish batch fetch allows max 10 URLs per call
    const CHUNK_SIZE = 10;
    const allResults: TinyFishFetchItem[] = [];
    const allErrors: Array<{ url: string; error: string }> = [];

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      const chunk = urls.slice(i, i + CHUNK_SIZE);
      try {
        const response = await fetch(this.fetchApiUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ urls: chunk })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[TinyFishService] Fetch HTTP error ${response.status}: ${errText}`);
          for (const u of chunk) {
            allErrors.push({ url: u, error: `HTTP ${response.status}: ${errText}` });
          }
          continue;
        }

        const data = (await response.json()) as TinyFishFetchResponse;
        if (data.results) allResults.push(...data.results);
        if (data.errors) allErrors.push(...data.errors);
      } catch (err: any) {
        console.error('[TinyFishService] Fetch error:', err.message);
        for (const u of chunk) {
          allErrors.push({ url: u, error: err.message });
        }
      }
    }

    return { results: allResults, errors: allErrors };
  }

  /**
   * Run web automation for interactive registration/form inspection
   * Warning from rules: if run_web_automation returns ANY error, the run may still be executing.
   * Call get_run or list_runs rather than blind retrying!
   */
  async runWebAutomation(url: string, goal: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('TINYFISH_API_KEY required for web automation');
    }

    const response = await fetch(this.agentApiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, goal })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Automation error ${response.status}: ${err}`);
    }

    return await response.json();
  }
}

export const tinyFishService = new TinyFishService();

