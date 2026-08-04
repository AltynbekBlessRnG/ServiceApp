export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateRegistrationPassword(value: string): string | null {
  if (value.length < 8) return 'Пароль должен содержать не менее 8 символов';
  if (!/[a-z]/.test(value)) return 'Добавьте строчную латинскую букву';
  if (!/[A-Z]/.test(value)) return 'Добавьте заглавную латинскую букву';
  if (!/\d/.test(value)) return 'Добавьте хотя бы одну цифру';
  return null;
}

export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed')) return 'Сначала подтвердите email по ссылке из письма';
  if (normalized.includes('invalid login credentials')) return 'Неверный email или пароль';
  if (normalized.includes('user already registered')) return 'Аккаунт с таким email уже существует';
  if (normalized.includes('rate limit') || normalized.includes('security purposes')) {
    return 'Слишком много попыток. Подождите немного и попробуйте снова';
  }
  if (normalized.includes('captcha')) return 'Не удалось пройти защиту от роботов';
  return message;
}
