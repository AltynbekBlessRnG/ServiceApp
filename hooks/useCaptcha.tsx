import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import React, { useCallback, useEffect, useRef } from 'react';
import { CAPTCHA_TIMEOUT_MS, getCaptchaSiteKey, interpretCaptchaEvent } from '../lib/captcha';

export type CaptchaResult =
  | { ok: true; token?: string }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'failed' | 'timeout'; message: string };

type CaptchaMessageEvent = {
  success?: boolean;
  markUsed?: () => void;
  nativeEvent?: { data?: string; description?: string };
};

/**
 * Wraps the hCaptcha WebView behind a promise so a screen can simply await a
 * token. Every outcome — token, cancellation, failure, silence — settles the
 * promise exactly once, so an unresponsive challenge can no longer leave the
 * calling screen stuck with no feedback.
 *
 * When EXPO_PUBLIC_HCAPTCHA_SITE_KEY is unset the gate resolves immediately
 * without a token, which matches a Supabase project that does not enforce
 * captcha.
 */
export function useCaptcha(label: string, size: 'invisible' | 'normal' = 'invisible') {
  const siteKey = getCaptchaSiteKey();
  const captchaRef = useRef<ConfirmHcaptcha>(null);
  const pendingRef = useRef<((result: CaptchaResult) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((result: CaptchaResult) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const resolve = pendingRef.current;
    if (!resolve) return;
    pendingRef.current = null;
    captchaRef.current?.hide();
    resolve(result);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      pendingRef.current = null;
    },
    [],
  );

  const requestToken = useCallback((): Promise<CaptchaResult> => {
    if (!siteKey) return Promise.resolve({ ok: true });
    if (pendingRef.current) return Promise.resolve({ ok: false, reason: 'cancelled' });

    return new Promise<CaptchaResult>((resolve) => {
      pendingRef.current = resolve;
      timeoutRef.current = setTimeout(() => {
        console.warn('hCaptcha did not respond', { label });
        settle({
          ok: false,
          reason: 'timeout',
          message: 'Проверка защиты не отвечает. Проверьте интернет и попробуйте ещё раз.',
        });
      }, CAPTCHA_TIMEOUT_MS);
      captchaRef.current?.show();
    });
  }, [label, settle, siteKey]);

  const element = siteKey ? (
    <ConfirmHcaptcha
      ref={captchaRef}
      siteKey={siteKey}
      size={size}
      baseUrl="https://hcaptcha.com"
      languageCode="ru"
      onMessage={(event: CaptchaMessageEvent) => {
        const outcome = interpretCaptchaEvent(event);
        if (outcome.kind === 'pending') return;
        if (outcome.kind === 'token') {
          settle({ ok: true, token: outcome.token });
          event.markUsed?.();
          return;
        }
        if (outcome.kind === 'cancelled') {
          settle({ ok: false, reason: 'cancelled' });
          return;
        }
        console.warn('hCaptcha failed', { label, result: event.nativeEvent?.data });
        settle({ ok: false, reason: 'failed', message: outcome.message });
      }}
    />
  ) : null;

  return { enabled: Boolean(siteKey), requestToken, element };
}
