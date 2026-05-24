import { GoogleGenAI, Type } from '@google/genai';
import { getPublicAppConfig } from './env';

const { geminiApiKey } = getPublicAppConfig();
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export interface SearchIntent {
  category?: string;
  city?: string;
  maxPrice?: number;
  intent: 'search_specialist' | 'search_venue' | 'general_question';
  query_tags: string[];
}

export function getFallbackSearchIntent(userInput: string): SearchIntent {
  return {
    intent: 'general_question',
    query_tags: [userInput],
  };
}

export const analyzeSearchIntent = async (userInput: string): Promise<SearchIntent> => {
  if (!ai) {
    return getFallbackSearchIntent(userInput);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this user request for a service app: "${userInput}".
Extract the category of service, city, and maximum price if mentioned.
Identify if they are looking for a specialist or a venue.
Provide search tags in Russian.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          city: { type: Type.STRING },
          maxPrice: { type: Type.NUMBER },
          intent: {
            type: Type.STRING,
            description: 'search_specialist, search_venue, or general_question',
          },
          query_tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['intent', 'query_tags'],
      },
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return getFallbackSearchIntent(userInput);
  }
};

export const getAIReviewSummary = async (reviews: any[]): Promise<string> => {
  if (!reviews.length) return 'Отзывов пока нет.';
  if (!ai) return 'Сводка ИИ недоступна без Gemini API key.';

  const text = reviews.map((review) => `[${review.rating}*] ${review.comment}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Сделай очень короткое резюме (1 предложение) на основе отзывов о мастере:\n${text}`,
  });

  return response.text || 'Нет данных для анализа.';
};
