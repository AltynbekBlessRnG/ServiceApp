import { Icon, Text, useTheme } from '@rneui/themed';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { ProfileCard } from '../../components/ProfileCard';
import { supabase } from '../../lib/supabase';

type ProviderType = 'specialist' | 'venue';
type SortBy = 'default' | 'price_asc' | 'price_desc' | 'distance';
type ServiceFilter = { slug: string; name: string };
type SearchRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  provider_type: ProviderType;
  category_name: string;
  service_name: string;
  service_slug: string;
  price_from: number;
  experience_years: number | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  distance_to_beach_m: number | null;
  avg_rating: number;
  review_count: number;
  distance_km: number | null;
};

export default function CategoryResultsScreen() {
  const { categorySlug = '', serviceSlug, name = 'Результаты', type = 'specialist' } =
    useLocalSearchParams<{
      categorySlug: string;
      serviceSlug?: string;
      name: string;
      type: ProviderType;
    }>();
  const providerType: ProviderType = type === 'venue' ? 'venue' : 'specialist';
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedServices, setSelectedServices] = useState<string[]>(serviceSlug ? [serviceSlug] : []);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (providerType !== 'venue') return;
    let active = true;
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const location = await Location.getCurrentPositionAsync({});
        if (active) setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
      } catch {
        // Distance sorting stays unavailable when location cannot be resolved.
      }
    })();
    return () => {
      active = false;
    };
  }, [providerType]);

  const { data: services = [] } = useQuery({
    queryKey: ['category-services', providerType, categorySlug],
    enabled: Boolean(categorySlug),
    queryFn: async (): Promise<ServiceFilter[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('slug, name, service_categories!inner(slug, provider_type)')
        .eq('service_categories.slug', categorySlug)
        .eq('service_categories.provider_type', providerType)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []).map((item: { slug: string; name: string }) => ({ slug: item.slug, name: item.name }));
    },
  });

  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['provider-search', providerType, categorySlug, selectedServices, sortBy, userLocation],
    enabled: Boolean(categorySlug),
    queryFn: async () => {
      const serviceFilters: (string | null)[] = selectedServices.length ? selectedServices : [null];
      const responses = await Promise.all(serviceFilters.map((selectedService) => supabase.rpc('search_providers', {
        p_provider_type: providerType,
        p_category_slug: categorySlug,
        p_service_slug: selectedService,
        p_city: null,
        p_max_price: null,
        p_sort: sortBy === 'distance' ? 'distance' : sortBy === 'price_asc' ? 'price' : 'rating',
        p_latitude: providerType === 'venue' ? userLocation?.lat ?? null : null,
        p_longitude: providerType === 'venue' ? userLocation?.lng ?? null : null,
      })));
      const failed = responses.find((response) => response.error);
      if (failed?.error) throw failed.error;
      const data = responses.flatMap((response) => response.data || []);

      const unique = new Map<string, SearchRow & { distance_km: number | null; role: ProviderType; price_start: number }>();
      for (const raw of data as SearchRow[]) {
        const current = unique.get(raw.id);
        const row = {
          ...raw,
          role: providerType,
          price_start: raw.price_from,
        };
        if (!current || row.price_from < current.price_from) unique.set(raw.id, row);
      }

      const result = [...unique.values()];
      if (sortBy === 'price_asc') result.sort((a, b) => a.price_from - b.price_from);
      if (sortBy === 'price_desc') result.sort((a, b) => b.price_from - a.price_from);
      if (sortBy === 'distance') {
        result.sort((a, b) => (a.distance_km ?? Number.POSITIVE_INFINITY) - (b.distance_km ?? Number.POSITIVE_INFINITY));
      }
      return result;
    },
  });

  const toggleService = (slug: string) => {
    setSelectedServices((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  };

  const sortOptions: { label: string; value: SortBy }[] = [
    { label: 'По умолчанию', value: 'default' },
    { label: 'Сначала дешёвые', value: 'price_asc' },
    { label: 'Сначала дорогие', value: 'price_desc' },
    ...(userLocation && providerType === 'venue' ? [{ label: 'По расстоянию', value: 'distance' as const }] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={name} />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.controlBtn, selectedServices.length > 0 && styles.activeBtn]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter" type="feather" size={16} color={selectedServices.length > 0 ? '#000' : '#fff'} />
          <Text style={[styles.btnText, selectedServices.length > 0 && { color: '#000' }]}>
            {selectedServices.length > 0 ? `Услуги (${selectedServices.length})` : 'Услуги'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setSortModalVisible(true)}>
          <Icon name="align-left" type="feather" size={16} color="#fff" />
          <Text style={styles.btnText}>Сортировка</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProfileCard item={item} type={providerType} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 50, flexGrow: 1 }}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <TouchableOpacity style={styles.emptyState} onPress={() => isError && refetch()}>
              <Icon name={isError ? 'alert-circle' : 'search'} type="feather" size={60} color="#2B3139" />
              <Text style={{ color: theme.colors.grey2, marginTop: 15, fontWeight: '600', textAlign: 'center' }}>
                {isError ? 'Не удалось загрузить результаты. Нажмите, чтобы повторить.' : 'Никого не найдено'}
              </Text>
            </TouchableOpacity>
          }
        />
      )}

      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите услуги</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="x" type="feather" color="#A09BAF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.tagsGrid}>
                {services.map((service) => {
                  const isActive = selectedServices.includes(service.slug);
                  return (
                    <TouchableOpacity
                      key={service.slug}
                      style={[styles.tagChip, isActive && styles.activeTagChip]}
                      onPress={() => toggleService(service.slug)}
                    >
                      <Text style={[styles.tagText, isActive && { color: '#000' }]}>{service.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={sortModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>Сортировка</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortItem}
                onPress={() => {
                  setSortBy(option.value);
                  setSortModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 16, color: sortBy === option.value ? '#F0B90B' : '#fff' }}>
                  {option.label}
                </Text>
                {sortBy === option.value && <Icon name="check" type="feather" color="#F0B90B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  topBar: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 10, gap: 10 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#1E2329', borderWidth: 1, borderColor: '#2B3139', gap: 8 },
  activeBtn: { backgroundColor: '#F0B90B', borderColor: '#F0B90B' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E2329', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2B3139', backgroundColor: '#121212' },
  activeTagChip: { backgroundColor: '#F0B90B', borderColor: '#F0B90B' },
  tagText: { color: '#A09BAF', fontWeight: '600' },
  applyBtn: { backgroundColor: '#F0B90B', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  sortItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2B3139' },
});
