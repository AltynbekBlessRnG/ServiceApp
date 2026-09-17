export type AppRole = 'client' | 'specialist' | 'venue';
export type ProviderType = 'specialist' | 'venue';
export type BookingKind = 'appointment' | 'stay';
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export function canTransitionBooking(
  actor: 'client' | 'provider' | 'admin',
  from: BookingStatus,
  to: BookingStatus,
  startsAt: Date,
  now = new Date(),
) {
  if (actor === 'admin') return from !== to;
  if (actor === 'client') {
    return to === 'cancelled' && (from === 'pending' || from === 'confirmed');
  }
  return (
    (from === 'pending' && (to === 'confirmed' || to === 'rejected'))
    || (from === 'confirmed' && to === 'completed' && startsAt <= now)
  );
}

export function formatPrice(value: number, locale = 'ru-RU') {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)} ₸`;
}

// provider_search_view отдаёт по строке на каждую услугу исполнителя. Там, где
// карточка — это человек, а не услуга (избранное, поиск, каталог, Алаколь), он
// иначе появляется столько раз, сколько у него услуг. Оставляем одну строку —
// с самой низкой ценой, потому что на карточке она подписана «от».
// id и price_from приходят из вьюхи, поэтому в сгенерированных типах nullable.
type ProviderRow = { id: string | null; price_from?: number | null };

const priceOf = (row: ProviderRow) => row.price_from || Number.POSITIVE_INFINITY;

export function deduplicateProviders<T extends ProviderRow>(rows: T[]) {
  const unique = new Map<string | null, T>();
  for (const row of rows) {
    const current = unique.get(row.id);
    if (!current || priceOf(row) < priceOf(current)) unique.set(row.id, row);
  }
  return [...unique.values()];
}

// Отправитель видит своё сообщение дважды, если ждать только подписку: сначала
// оптимистичную строку с временным id, потом настоящую с UUID из базы —
// сравнение по id их не склеивает. Настоящая строка занимает место своей
// оптимистичной пары: то же отправитель и тот же текст.
export type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  pending?: boolean;
};

export function mergeIncomingMessage<T extends ChatMessage>(current: T[], message: T): T[] {
  if (current.some((item) => item.id === message.id)) return current;
  const pendingIndex = current.findIndex(
    (item) => item.pending && item.sender_id === message.sender_id && item.content === message.content,
  );
  if (pendingIndex === -1) return [message, ...current];
  const next = [...current];
  next[pendingIndex] = message;
  return next;
}
