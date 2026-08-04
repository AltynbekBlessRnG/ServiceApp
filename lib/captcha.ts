const TAPTYM_HCAPTCHA_SITE_KEY = 'ec744f86-bef8-4238-8e9e-cc6a39a280d0';

export function getCaptchaSiteKey(): string {
  return process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY?.trim() || TAPTYM_HCAPTCHA_SITE_KEY;
}
