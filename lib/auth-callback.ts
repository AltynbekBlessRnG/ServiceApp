export function readAuthCallbackTokens(url: string) {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const fragmentValues = new URLSearchParams(fragment);
  const queryValues = new URLSearchParams(query);
  const getValue = (key: string) => fragmentValues.get(key) ?? queryValues.get(key);

  return {
    code: getValue('code'),
    accessToken: getValue('access_token'),
    refreshToken: getValue('refresh_token'),
    tokenHash: getValue('token_hash'),
    type: getValue('type'),
  };
}
