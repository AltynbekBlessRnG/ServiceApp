const TAPTYM_HCAPTCHA_SITE_KEY = 'ec744f86-bef8-4238-8e9e-cc6a39a280d0';

type CaptchaEventLike = {
  success?: boolean;
  nativeEvent?: {
    data?: string;
    description?: string;
  };
};

export function getCaptchaSiteKey(): string {
  return process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY?.trim() || TAPTYM_HCAPTCHA_SITE_KEY;
}

export function getCaptchaFailureMessage(event: CaptchaEventLike): string | null {
  const result = event.nativeEvent?.data;
  const description = event.nativeEvent?.description;

  if (!result || event.success || ['open', 'loading', 'challenge-closed'].includes(result)) return null;

  // The SDK emits this after 15 seconds but keeps loading in the background.
  // Treating it as terminal makes captcha fail on slower mobile connections.
  if (result === 'error' && description === 'loading timeout') return null;

  if (result === 'script-error') {
    return 'Не удалось загрузить hCaptcha. Проверьте интернет и попробуйте ещё раз.';
  }

  if (result === 'network-error') {
    return 'Нет соединения с hCaptcha. Проверьте интернет и повторите попытку.';
  }

  return 'Проверка hCaptcha завершилась с ошибкой. Попробуйте ещё раз.';
}
