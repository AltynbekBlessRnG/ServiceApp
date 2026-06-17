import { Icon, Text } from '@rneui/themed';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useHaptics } from '../hooks/useHaptics';
import { UserAvatar } from './UserAvatar';

interface ProfileCardProps {
  item: any;
  type?: 'specialist' | 'venue';
}

const zoneLabelMap: Record<string, string> = {
  akshi: 'Акши',
  koktuma: 'Коктума',
  usharal: 'Ушарал',
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ item, type = 'specialist' }) => {
  const haptics = useHaptics();

  const handlePress = () => {
    haptics.light();
    const route = type === 'venue' ? `/venue-details/${item.id}` : `/specialist-details/${item.id}`;
    router.push(route as any);
  };

  const displayName = item.full_name || item.profiles?.full_name || 'Без имени';
  const displayCity = item.city || item.profiles?.city || 'Казахстан';
  const rating = item.avg_rating > 0 ? Number(item.avg_rating).toFixed(1) : 'NEW';
  const avatarUrl = item.avatar_url || item.profiles?.avatar_url;
  const priceValue = type === 'venue' ? item.price_from || item.price_start : item.price_start;
  const price = priceValue ? `${Number(priceValue).toLocaleString()} ₸` : null;
  const locationZone = item.location_zone || item.alakol_zone;
  const zoneLabel = locationZone ? zoneLabelMap[locationZone] : null;
  const isInAlakol = Boolean(item.works_in_alakol || locationZone);
  const metaLabel = type === 'specialist'
    ? `${item.experience_years || 0} лет опыта`
    : item.distance_to_beach_m
      ? `${item.distance_to_beach_m} м до моря`
      : `до ${item.capacity || 0} чел.`;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress} style={styles.container}>
      <View style={styles.topRow}>
        <UserAvatar avatarUrl={avatarUrl} size={48} />
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {rating !== 'NEW' && (
              <View style={styles.ratingBadge}>
                <Icon name="star" type="font-awesome" size={10} color="#F0B90B" />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subInfo}>{item.category_name} · {displayCity}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{metaLabel}</Text>
          {price && <Text style={styles.priceText}>{price}</Text>}
        </View>

        {(zoneLabel || isInAlakol) && (
          <View style={styles.badgeRow}>
            {zoneLabel && (
              <View style={styles.zoneBadge}>
                <Text style={styles.zoneText}>{zoneLabel}</Text>
              </View>
            )}
            {isInAlakol && type === 'specialist' && (
              <View style={styles.alakolBadge}>
                <Text style={styles.alakolText}>На Алаколе</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E2329',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  infoSection: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#FAFAFA', flex: 1 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(240, 185, 11, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#F0B90B' },
  subInfo: { fontSize: 12, color: '#848E9C', marginTop: 3, fontWeight: '500' },
  bottomRow: { marginTop: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#848E9C', fontWeight: '500' },
  priceText: { fontSize: 15, fontWeight: '800', color: '#FAFAFA' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  zoneBadge: {
    backgroundColor: 'rgba(240, 185, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoneText: { fontSize: 11, fontWeight: '700', color: '#F0B90B' },
  alakolBadge: {
    backgroundColor: 'rgba(38, 207, 135, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alakolText: { fontSize: 11, fontWeight: '700', color: '#26CF87' },
});
