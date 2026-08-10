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

export function getRegistrationValidationError(fields: {
  fullName: string;
  city: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedLegal: boolean;
}): { title: string; message: string } | null {
  if (!fields.fullName.trim()) return { title: 'Введите имя', message: 'Укажите ваше ФИО или название.' };
  if (!fields.city) return { title: 'Выберите город', message: 'Укажите город, в котором вы находитесь.' };
  const normalizedEmail = normalizeEmail(fields.email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) return { title: 'Некорректный email', message: 'Проверьте адрес электронной почты.' };
  const passwordError = validateRegistrationPassword(fields.password);
  if (passwordError) return { title: 'Ненадёжный пароль', message: passwordError };
  if (fields.password !== fields.passwordConfirmation) return { title: 'Пароли не совпадают', message: 'Повторно введите одинаковый пароль.' };
  if (!fields.acceptedLegal) return { title: 'Нужно согласие', message: 'Примите условия использования и политику конфиденциальности.' };
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
