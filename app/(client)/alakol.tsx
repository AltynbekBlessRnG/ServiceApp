import { Button, Icon, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { ProfileCard } from '../../components/ProfileCard';
import { supabase } from '../../lib/supabase';

const ZONES = [
  { label: 'Акши', value: 'akshi' },
  { label: 'Коктума', value: 'koktuma' },
  { label: 'Ушарал', value: 'usharal' },
] as const;

const ALAKOL_VENUE_CATEGORIES = ['Зоны и базы отдыха', 'Глэмпинги', 'Отели и хостелы', 'Санатории', 'Детские лагеря'];

export default function AlakolHubScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'stay' | 'services'>('stay');
  const [zone, setZone] = useState<'akshi' | 'koktuma' | 'usharal'>('akshi');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'stay') {
        const { data } = await supabase
          .from('provider_search_view')
          .select('*')
          .eq('provider_type', 'venue')
          .eq('location_zone', zone)
          .limit(ALAKOL_VENUE_CATEGORIES.length * 20);

        setItems(Array.from(new Map((data || []).map((item: any) => [item.id, item])).values()));
      } else {
        const { data } = await supabase
          .from('provider_search_view')
          .select('*')
          .eq('provider_type', 'specialist')
          .eq('service_area', zone)
          .limit(100);

        setItems(Array.from(new Map((data || []).map((item: any) => [item.id, item])).values()));
      }
    } finally {
      setLoading(false);
    }
  }, [mode, zone]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const emptyText = useMemo(
    () => (mode === 'stay' ? 'Пока нет объектов в этой зоне' : 'Пока нет специалистов в этой зоне'),
    [mode],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader title="Алаколь 2026" />

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Сезонный хаб Алаколя</Text>
        <Text style={styles.heroSub}>Жилье, услуги и бронирование в Акши, Коктуме и Ушарале</Text>
      </View>

      <View style={styles.segmented}>
        <TouchableOpacity style={[styles.segment, mode === 'stay' && styles.segmentActive]} onPress={() => setMode('stay')}>
          <Text style={[styles.segmentText, mode === 'stay' && styles.segmentTextActive]}>Где жить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segment, mode === 'services' && styles.segmentActive]} onPress={() => setMode('services')}>
          <Text style={[styles.segmentText, mode === 'services' && styles.segmentTextActive]}>Услуги рядом</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.zoneRow}>
        {ZONES.map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setZone(item.value)}
            style={[styles.zoneChip, zone === item.value && { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.zoneText, zone === item.value && { color: '#fff' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          renderItem={({ item }) => <ProfileCard item={item} type={mode === 'stay' ? 'venue' : 'specialist'} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="map-pin" type="feather" size={48} color={theme.colors.grey2} />
              <Text style={styles.emptyTitle}>{emptyText}</Text>
              <Button title="Вернуться в каталог" type="clear" onPress={() => router.push('/(client)/home')} />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSub: { color: '#A09BAF', marginTop: 6, fontSize: 14 },
  segmented: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E2329', borderRadius: 16, padding: 4, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: '#2B3139' },
  segmentText: { color: '#A09BAF', fontWeight: '800' },
  segmentTextActive: { color: '#F0B90B' },
  zoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  zoneChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#1E2329' },
  zoneText: { color: '#A09BAF', fontWeight: '700' },
  empty: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { color: '#A09BAF', marginTop: 16, marginBottom: 10, fontWeight: '700' },
});
