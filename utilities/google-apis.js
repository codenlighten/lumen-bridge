import dotenv from 'dotenv';
// If you're on Node < 18, uncomment the next line:
// import fetch from 'node-fetch';

dotenv.config();

/**
 * GoogleSearchService
 *
 * Minimal wrapper around Google Custom Search Engine (CSE).
 * Your AI can call this to search the web and get raw results.
 */

export class GoogleSearchService {
  constructor() {
    this.searchApiKey = process.env.GOOGLE_API_KEY;
    this.searchEngineId = process.env.GOOGLE_CSE_ID || process.env.CSE_ID;
    this.searchBaseUrl = 'https://www.googleapis.com/customsearch/v1';

    if (!this.searchApiKey || !this.searchEngineId) {
      console.warn(
        '[GoogleSearchService] GOOGLE_API_KEY or GOOGLE_CSE_ID is not set. Web search will not work.'
      );
    }
  }

  /**
   * Run a Google Custom Search query.
   *
   * @param {string} query - Search query string
   * @param {object} options
   *   - num: number of results to return (max 10 per API)
   *   - extraParams: any extra query parameters to pass through to CSE
   *
   * @returns {Promise<Array>} CSE `items` array (or [] on error)
   */
  async search(query, { num = 10, extraParams = {} } = {}) {
    if (!this.searchApiKey || !this.searchEngineId) {
      console.error(
        '[GoogleSearchService] Missing GOOGLE_API_KEY or CSE_ID environment variables.'
      );
      return [];
    }

    try {
      const url = new URL(this.searchBaseUrl);
      url.searchParams.set('key', this.searchApiKey);
      url.searchParams.set('cx', this.searchEngineId);
      url.searchParams.set('q', query);
      url.searchParams.set('num', Math.min(num, 10));

      // Pass through any additional CSE params (e.g., "lr", "cr", "safe", etc.)
      for (const [k, v] of Object.entries(extraParams)) {
        url.searchParams.set(k, v);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Google Search API error: ${data.error?.message || response.statusText}`
        );
      }

      // Raw CSE items – each has title, link, snippet, etc.
      return data.items || [];
    } catch (error) {
      console.error('[GoogleSearchService] search error:', error.message);
      return [];
    }
  }

  /**
   * Convenience helper to bias a query by location keywords.
   * This is purely textual, not true geo-bias.
   *
   * @param {string} query - base query
   * @param {string} location - e.g. "Harrisonburg VA"
   * @param {object} options - same as `search` options
   */
  async searchWithLocation(query, location, options = {}) {
    const fullQuery = [query, location].filter(Boolean).join(' ');
    return this.search(fullQuery, options);
  }
}

export default new GoogleSearchService();
