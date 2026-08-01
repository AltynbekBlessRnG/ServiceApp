import { supabase } from './supabase';
import { getFallbackSearchIntent, SearchIntent } from './search-intent';

export type { SearchIntent } from './search-intent';

function isSearchIntent(value: unknown): value is SearchIntent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SearchIntent>;
  return (
    typeof candidate.intent === 'string' &&
    ['search_specialist', 'search_venue', 'general_question'].includes(candidate.intent) &&
    Array.isArray(candidate.serviceSlugs)
  );
}

export async function analyzeSearchIntent(userInput: string): Promise<SearchIntent> {
  const fallback = getFallbackSearchIntent(userInput);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-search', {
      body: { query: userInput.trim() },
    });

    if (error || !isSearchIntent(data)) {
      return fallback;
    }

    return data;
  } catch {
    return fallback;
  }
}
