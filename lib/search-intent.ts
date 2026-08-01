export interface SearchIntent {
  categorySlug?: string;
  city?: string;
  maxPrice?: number;
  providerType?: 'specialist' | 'venue';
  intent: 'search_specialist' | 'search_venue' | 'general_question';
  serviceSlugs?: string[];
}

export function getFallbackSearchIntent(userInput: string): SearchIntent {
  void userInput;
  return {
    intent: 'general_question',
    serviceSlugs: [],
  };
}
