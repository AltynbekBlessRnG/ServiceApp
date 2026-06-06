import { Icon, Text, useTheme } from '@rneui/themed';
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
  const { theme } = useTheme();
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
  const price = priceValue ? `${priceValue} ₸` : null;
  const locationZone = item.location_zone || item.alakol_zone;
  const zoneLabel = locationZone ? zoneLabelMap[locationZone] : null;
  const isInAlakol = Boolean(item.works_in_alakol || locationZone);
  const metaLabel = type === 'specialist'
    ? `Опыт: ${item.experience_years || 0} г.`
    : item.distance_to_beach_m
      ? `До берега: ${item.distance_to_beach_m} м`
      : `Мест: ${item.capacity || 0}`;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.grey0,
          borderWidth: 1,
          borderColor: theme.colors.grey1,
        },
      ]}
    >
      <View style={styles.mainRow}>
        <UserAvatar avatarUrl={avatarUrl} size={60} />

        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.name, { color: theme.colors.black }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={[styles.ratingBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
              <Icon name="star" type="font-awesome" size={10} color="#FFD700" />
              <Text style={[styles.ratingText, { color: '#FFD700' }]}>{rating}</Text>
            </View>
          </View>

          <Text style={[styles.subInfo, { color: theme.colors.grey2 }]}>
            {item.category_name} • {displayCity}
          </Text>

          <View style={styles.footerRow}>
            <View style={[styles.badge, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.metaText, { color: theme.colors.grey2 }]}>{metaLabel}</Text>
            </View>
            {price && (
              <Text
                style={[
                  styles.priceText,
                  {
                    color: theme.colors.secondary,
                    textShadowColor: theme.colors.secondary,
                    textShadowRadius: 5,
                  },
                ]}
              >
                {price}
              </Text>
            )}
          </View>

          {(zoneLabel || isInAlakol) && (
            <View style={styles.alakolRow}>
              {zoneLabel && (
                <View style={[styles.alakolBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.alakolText, { color: theme.colors.primary }]}>{zoneLabel}</Text>
                </View>
              )}
              {isInAlakol && type === 'specialist' && (
                <View style={[styles.alakolBadge, { backgroundColor: theme.colors.secondary + '20' }]}>
                  <Text style={[styles.alakolText, { color: theme.colors.secondary }]}>На Алаколе сейчас</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 20, padding: 16, marginBottom: 12 },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  infoSection: { flex: 1, marginLeft: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 8 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: 'bold' },
  subInfo: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  alakolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  alakolBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  alakolText: { fontSize: 11, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, fontWeight: '600' },
  priceText: { fontSize: 16, fontWeight: '900' },
});
