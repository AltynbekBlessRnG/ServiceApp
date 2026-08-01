import * as WebBrowser from 'expo-web-browser';

export type LegalDocument = 'privacy' | 'terms' | 'support';

export function getLegalUrl(document: LegalDocument) {
  const baseUrl = process.env.EXPO_PUBLIC_LEGAL_BASE_URL?.replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}/${document}.html` : null;
}

export async function openLegalDocument(document: LegalDocument) {
  const url = getLegalUrl(document);
  if (!url) throw new Error('Юридический URL ещё не настроен');
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
