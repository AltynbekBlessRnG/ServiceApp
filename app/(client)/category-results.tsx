import { Icon, Text, useTheme } from '@rneui/themed';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { ProfileCard } from '../../components/ProfileCard';
import { supabase } from '../../lib/supabase';

export default function CategoryResultsScreen() {
  const { id, name, type } = useLocalSearchParams();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Принудительно превращаем ID в число
  const categoryId = Number(id);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]); 
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'distance'>('default');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
      if (isNaN(categoryId)) return;
      fetchTags();
      requestLocation();
  }, [categoryId]);

  useEffect(() => { 
      if (!isNaN(categoryId)) fetchItems(); 
  }, [categoryId, selectedTags, sortBy]);

  async function fetchTags() {
      if (type !== 'specialist') return;
      const { data } = await supabase.from('subcategories').select('*').eq('category_id', categoryId);
      if (data) setSubcategories(data);
  }

  async function requestLocation() {
      try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {}
  }

  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async function fetchItems() {
    setLoading(true);
    try {
        if (type === 'specialist') {

            // 1. Фильтр по тегам (если есть)
            let validSpecialistIds: string[] | null = null;
            if (selectedTags.length > 0) {
                const { data: tagMatches } = await supabase
                    .from('specialist_subcategories')
                    .select('specialist_id')
                    .in('subcategory_id', selectedTags);
                
                if (tagMatches) validSpecialistIds = [...new Set(tagMatches.map(t => t.specialist_id))];
            }

            // 2. Основной запрос
            let query = supabase
                .from('specialist_profiles')
                .select(`*, profiles!inner(*), categories(name)`)
                .eq('category_id', categoryId); // <--- ВОТ ГЛАВНЫЙ ФИЛЬТР

            // Если он не работает, значит у юзера в базе не тот ID, или ID категории приходит неверный

            if (validSpecialistIds !== null) {
                if (validSpecialistIds.length === 0) {
                    setItems([]); setLoading(false); return;
                }
                query = query.in('id', validSpecialistIds);
            }

            if (sortBy === 'price_asc') query = query.order('price_start', { ascending: true });
            if (sortBy === 'price_desc') query = query.order('price_start', { ascending: false });

            const { data, error } = await query;
            
            if (error) throw error;

            // Получаем реальные рейтинги для специалистов
            const specialistIds = data.map((item: any) => item.id);
            let ratingMap: Record<string, number> = {};
            if (specialistIds.length > 0) {
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('target_id, rating')
                    .in('target_id', specialistIds);
                if (reviews) {
                    const grouped = reviews.reduce((acc: any, r: any) => {
                        if (!acc[r.target_id]) acc[r.target_id] = [];
                        acc[r.target_id].push(r.rating);
                        return acc;
                    }, {});
                    for (const [id, ratings] of Object.entries(grouped)) {
                        const arr = ratings as number[];
                        ratingMap[id] = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
                    }
                }
            }

            const formatted = data.map((item: any) => ({
                id: item.id,
                full_name: item.profiles.full_name,
                avatar_url: item.profiles.avatar_url,
                city: item.profiles.city,
                experience_years: item.experience_years,
                price_start: item.price_start,
                avg_rating: ratingMap[item.id] || 0,
                category_name: item.categories?.name
            }));

            setItems(formatted);

        } else {
            // Для заведений
            let query = supabase
                .from('venue_profiles')
                .select('*, profiles(*), categories(name)')
                .eq('category_id', categoryId);
            
            if (sortBy === 'price_asc') query = query.order('price_from', { ascending: true });
            if (sortBy === 'price_desc') query = query.order('price_from', { ascending: false });

            const { data } = await query;

            // Получаем рейтинги для заведений
            const venueIds = data?.map((v: any) => v.id) || [];
            let ratingMap: Record<string, number> = {};
            if (venueIds.length > 0) {
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('target_id, rating')
                    .in('target_id', venueIds);
                if (reviews) {
                    const grouped = reviews.reduce((acc: any, r: any) => {
                        if (!acc[r.target_id]) acc[r.target_id] = [];
                        acc[r.target_id].push(r.rating);
                        return acc;
                    }, {});
                    for (const [id, ratings] of Object.entries(grouped)) {
                        const arr = ratings as number[];
                        ratingMap[id] = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
                    }
                }
            }

            const formatted = data?.map((item: any) => ({
                id: item.id,
                full_name: item.profiles.full_name,
                avatar_url: item.profiles.avatar_url,
                city: item.profiles.city,
                price_from: item.price_from,
                capacity: item.capacity,
                distance_to_beach_m: item.distance_to_beach_m,
                location_zone: item.location_zone,
                category_name: item.categories?.name,
                avg_rating: ratingMap[item.id] || 0,
                distance_km: item.latitude && item.longitude && userLocation
                    ? getDistance(userLocation.lat, userLocation.lng, item.latitude, item.longitude)
                    : null,
            })) || [];

            // Сортировка по расстоянию
            if (sortBy === 'distance' && userLocation) {
                formatted.sort((a: any, b: any) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
            }

            setItems(formatted);
        }
    } catch (e) {
        // fetch error
    } finally {
        setLoading(false);
    }
  }

  const toggleTag = (tagId: number) => {
      if (selectedTags.includes(tagId)) setSelectedTags(prev => prev.filter(t => t !== tagId));
      else setSelectedTags(prev => [...prev, tagId]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={name as string} />
      
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
      <View style={styles.topBar}>
          <TouchableOpacity 
            style={[styles.controlBtn, selectedTags.length > 0 && styles.activeBtn]} 
            onPress={() => setFilterModalVisible(true)}
          >
              <Icon name="filter" type="feather" size={16} color={selectedTags.length > 0 ? '#000' : '#fff'} />
              <Text style={[styles.btnText, selectedTags.length > 0 && { color: '#000' }]}>
                  {selectedTags.length > 0 ? `Навыки (${selectedTags.length})` : 'Навыки'}
              </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlBtn} 
            onPress={() => setSortModalVisible(true)}
          >
              <Icon name="align-left" type="feather" size={16} color="#fff" />
              <Text style={styles.btnText}>
                  {sortBy === 'default' ? 'Сортировка' : 'Сортировка'}
              </Text>
          </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} size="large" />
      ) : (
        <FlatList
            data={items}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => <ProfileCard item={item} type={type as any} />}
            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                     <Icon name="search" type="feather" size={60} color="#2B3139" />
            <Text style={{ color: theme.colors.grey2, marginTop: 15, fontWeight: '600' }}>
                {items.length === 0 ? 'Никого нет' : 'Ничего не найдено'}
            </Text>
                </View>
            }
        />
      )}

      {/* МОДАЛКА ФИЛЬТРОВ */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: '#1E2329', paddingBottom: insets.bottom + 20 }]}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Выберите навыки</Text>
                      <TouchableOpacity onPress={() => setFilterModalVisible(false)}><Icon name="x" type="feather" color="#A09BAF" /></TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 400 }}>
                      <View style={styles.tagsGrid}>
                          {subcategories.map((sub) => {
                              const isActive = selectedTags.includes(sub.id);
                              return (
                                  <TouchableOpacity key={sub.id} style={[styles.tagChip, isActive && styles.activeTagChip]} onPress={() => toggleTag(sub.id)}>
                                      <Text style={[styles.tagText, isActive && { color: '#000' }]}>{sub.name}</Text>
                                  </TouchableOpacity>
                              )
                          })}
                      </View>
                  </ScrollView>
                  <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
                      <Text style={{ color: '#000', fontWeight: 'bold' }}>Применить</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* МОДАЛКА СОРТИРОВКИ */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
              <View style={[styles.modalContent, { backgroundColor: '#1E2329', paddingBottom: insets.bottom + 20 }]}>
                  <Text style={styles.modalTitle}>Сортировка</Text>
                   {[
                       { label: 'По умолчанию', value: 'default' },
                       { label: 'Сначала дешевые', value: 'price_asc' },
                       { label: 'Сначала дорогие', value: 'price_desc' },
                       ...(userLocation && type === 'venue' ? [{ label: 'По расстоянию', value: 'distance' }] : []),
                   ].map((opt) => (
                      <TouchableOpacity key={opt.value} style={styles.sortItem} onPress={() => { setSortBy(opt.value as any); setSortModalVisible(false); }}>
                          <Text style={{ fontSize: 16, color: sortBy === opt.value ? '#F0B90B' : '#fff' }}>{opt.label}</Text>
                          {sortBy === opt.value && <Icon name="check" type="feather" color="#F0B90B" />}
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
  emptyState: { alignItems: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2B3139', backgroundColor: '#121212' },
  activeTagChip: { backgroundColor: '#F0B90B', borderColor: '#F0B90B' },
  tagText: { color: '#A09BAF', fontWeight: '600' },
  applyBtn: { backgroundColor: '#F0B90B', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  sortItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2B3139' }
});