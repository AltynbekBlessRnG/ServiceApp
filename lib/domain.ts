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

export function deduplicateProviders<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}
