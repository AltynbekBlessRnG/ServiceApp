type CaptchaEventLike = {
  success?: boolean;
  nativeEvent?: {
    data?: string;
    description?: string;
  };
};

// The hCaptcha WebView can stay silent when the challenge never finishes
// loading. Without an upper bound the sign-up button would spin forever.
export const CAPTCHA_TIMEOUT_MS = 30000;

// No fallback site key: a key that is not paired with the secret stored in
// Supabase Auth makes every request fail with `invalid-input-response`, and a
// hardcoded default hides that misconfiguration from every build.
export function getCaptchaSiteKey(): string {
  return process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? '';
}

export function isCaptchaEnabled(): boolean {
  return getCaptchaSiteKey().length > 0;
}

export type CaptchaEventOutcome =
  | { kind: 'token'; token: string }
  | { kind: 'pending' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string };

export function interpretCaptchaEvent(event: CaptchaEventLike): CaptchaEventOutcome {
  const result = event.nativeEvent?.data;
  const description = event.nativeEvent?.description;

  if (event.success && result) return { kind: 'token', token: result };
  if (!result || ['open', 'loading'].includes(result)) return { kind: 'pending' };
  if (result === 'challenge-closed') return { kind: 'cancelled' };

  // The SDK emits this after 15 seconds but keeps loading in the background.
  // Treating it as terminal makes captcha fail on slower mobile connections.
  if (result === 'error' && description === 'loading timeout') return { kind: 'pending' };

  if (result === 'script-error') {
    return { kind: 'failed', message: 'Не удалось загрузить hCaptcha. Проверьте интернет и попробуйте ещё раз.' };
  }

  if (result === 'network-error') {
    return { kind: 'failed', message: 'Нет соединения с hCaptcha. Проверьте интернет и повторите попытку.' };
  }

  return { kind: 'failed', message: 'Проверка hCaptcha завершилась с ошибкой. Попробуйте ещё раз.' };
}

// Supabase rejects the token server-side when its stored hCaptcha secret does
// not belong to the same hCaptcha site as EXPO_PUBLIC_HCAPTCHA_SITE_KEY. That
// is a deployment fault, not something the person registering can fix, so it
// must not be reported as a generic "you failed the robot check".
export function describeCaptchaRejection(message: string): string | null {
  const normalized = message.toLowerCase();
  if (!normalized.includes('captcha')) return null;

  if (
    normalized.includes('invalid-input-response') ||
    normalized.includes('invalid-input-secret') ||
    normalized.includes('sitekey-secret-mismatch')
  ) {
    return 'Защита от роботов настроена неверно на сервере: ключи hCaptcha не совпадают. Это ошибка конфигурации приложения, а не ваша.';
  }

  if (normalized.includes('no captcha_token found')) {
    return 'Приложение не отправило проверку hCaptcha. Обновите приложение или попробуйте позже.';
  }

  return 'Не удалось пройти защиту от роботов. Попробуйте ещё раз.';
}
