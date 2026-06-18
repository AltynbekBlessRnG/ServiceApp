import { Button, CheckBox, Icon, Input, Text, useTheme } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../lib/uploader';
import { useAuth } from '../../providers/AuthProvider';

const ALAKOL_ZONES = [
  { label: 'Акши', value: 'akshi' },
  { label: 'Коктума', value: 'koktuma' },
  { label: 'Ушарал', value: 'usharal' },
] as const;

export default function EditVenueProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locationZone, setLocationZone] = useState<'akshi' | 'koktuma' | 'usharal' | null>(null);
  const [priceFrom, setPriceFrom] = useState('');
  const [distanceToBeach, setDistanceToBeach] = useState('');
  const [seasonOpen, setSeasonOpen] = useState('');
  const [seasonClose, setSeasonClose] = useState('');
  const [hasWifi, setHasWifi] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasMeals, setHasMeals] = useState(false);
  const [familyFriendly, setFamilyFriendly] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);

  useEffect(() => {
    if (!authLoading && user) loadData();
  }, [authLoading, user]);

  async function loadData() {
    try {
      const { data: catData } = await supabase.from('categories').select('id, name').eq('type', 'venue').order('name');
      if (catData) setCategories(catData);

      if (!user) return;
      const { data: profile } = await supabase.from('venue_profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setDescription(profile.description || '');
        setAddress(profile.address || '');
        setCapacity(profile.capacity ? String(profile.capacity) : '');
        setSelectedCategory(profile.category_id);
        setLocationZone(profile.location_zone || null);
        setPriceFrom(profile.price_from ? String(profile.price_from) : '');
        setDistanceToBeach(profile.distance_to_beach_m ? String(profile.distance_to_beach_m) : '');
        setSeasonOpen(profile.season_open || '');
        setSeasonClose(profile.season_close || '');
        setHasWifi(Boolean(profile.has_wifi));
        setHasParking(Boolean(profile.has_parking));
        setHasMeals(Boolean(profile.has_meals));
        setFamilyFriendly(Boolean(profile.family_friendly));
        setPetFriendly(Boolean(profile.pet_friendly));
        if (profile.latitude && profile.longitude) setLocation({ lat: profile.latitude, lon: profile.longitude });
      }

      const { data: mainProfile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      if (mainProfile) setAvatarUrl(mainProfile.avatar_url);
    } catch (e) {
      // ignore
    } finally {
      setFetching(false);
    }
  }

  async function getCurrentLocation() {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Ошибка', 'Нужен доступ к геолокации');
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      Alert.alert('Успех', 'Координаты определены');
    } catch {
      Alert.alert('Ошибка', 'Не удалось определить местоположение');
    } finally {
      setLocLoading(false);
    }
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const fileName = `${user?.id}/avatar_${Date.now()}.jpg`;
        const publicUrl = await uploadFileToSupabase('avatars', result.assets[0].uri, fileName);
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user?.id);
        setAvatarUrl(publicUrl);
      } finally {
        setLoading(false);
      }
    }
  }

  async function saveProfile() {
    if (!user) return;
    setLoading(true);
    try {
      const updates = {
        id: user.id,
        description,
        address,
        capacity: parseInt(capacity, 10) || 0,
        category_id: selectedCategory,
        latitude: location?.lat ?? null,
        longitude: location?.lon ?? null,
        location_zone: locationZone,
        price_from: parseInt(priceFrom, 10) || 0,
        distance_to_beach_m: distanceToBeach ? parseInt(distanceToBeach, 10) : null,
        season_open: seasonOpen || null,
        season_close: seasonClose || null,
        has_wifi: hasWifi,
        has_parking: hasParking,
        has_meals: hasMeals,
        family_friendly: familyFriendly,
        pet_friendly: petFriendly,
      };

      const { error } = await supabase.from('venue_profiles').upsert(updates as any);
      if (error) throw error;
      Alert.alert('Успех', 'Профиль объекта обновлен');
      router.back();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || fetching) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" type="feather" color={theme.colors.black} />
          </TouchableOpacity>
          <Text h4 style={{ color: theme.colors.black }}>Объект на Алаколе</Text>
          <View style={{ width: 40 }} />
        </View>

        <TouchableOpacity onPress={pickAvatar} style={styles.avatarSection}>
          <UserAvatar avatarUrl={avatarUrl} size={100} />
          <Text style={{ color: theme.colors.primary, marginTop: 10, fontWeight: '600' }}>Логотип / главное фото</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: theme.colors.grey2 }]}>КАТЕГОРИЯ</Text>
        <View style={styles.catContainer}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.chip, isActive ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.grey0, borderWidth: 1, borderColor: theme.colors.grey1 }]}
              >
                <Text style={[styles.chipText, { color: isActive ? '#fff' : theme.colors.black }]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.colors.grey2 }]}>ЗОНА АЛАКОЛЯ</Text>
        <View style={styles.catContainer}>
          {ALAKOL_ZONES.map((item) => {
            const isActive = locationZone === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setLocationZone(item.value)}
                style={[styles.chip, isActive ? { backgroundColor: theme.colors.secondary } : { backgroundColor: theme.colors.grey0, borderWidth: 1, borderColor: theme.colors.grey1 }]}
              >
                <Text style={[styles.chipText, { color: isActive ? '#000' : theme.colors.black }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input label="Адрес / название объекта" value={address} onChangeText={setAddress} placeholder="Акши, 1 линия, база отдыха..." leftIcon={<Icon name="map-pin" type="feather" size={18} color={theme.colors.grey2} />} />

        <View style={[styles.geoBlock, { backgroundColor: theme.colors.grey0, borderColor: location ? '#10B981' : theme.colors.grey1 }]}>
          <View>
            <Text style={{ fontWeight: 'bold', color: theme.colors.black }}>Точные координаты</Text>
            <Text style={{ fontSize: 12, color: location ? '#10B981' : 'gray', marginTop: 4 }}>
              {location ? 'Координаты установлены' : 'Нужно для карты и навигации'}
            </Text>
          </View>
          <TouchableOpacity onPress={getCurrentLocation} style={styles.geoBtn}>
            {locLoading ? <ActivityIndicator color={theme.colors.primary} /> : <Icon name="crosshair" type="feather" color={theme.colors.primary} />}
          </TouchableOpacity>
        </View>

        <Input label="Описание" multiline numberOfLines={3} value={description} onChangeText={setDescription} placeholder="Семейная база отдыха, 2 минуты до берега..." />
        <Input label="Вместимость (чел.)" keyboardType="numeric" value={capacity} onChangeText={setCapacity} placeholder="50" />
        <Input label="Цена от (₸/сутки)" keyboardType="numeric" value={priceFrom} onChangeText={setPriceFrom} placeholder="25000" />
        <Input label="До берега (метры)" keyboardType="numeric" value={distanceToBeach} onChangeText={setDistanceToBeach} placeholder="120" />
        <Input label="Сезон открыт с" value={seasonOpen} onChangeText={setSeasonOpen} placeholder="2026-06-01" />
        <Input label="Сезон открыт до" value={seasonClose} onChangeText={setSeasonClose} placeholder="2026-09-15" />

        <View style={styles.checkGrid}>
          <CheckBox title="Wi‑Fi" checked={hasWifi} onPress={() => setHasWifi((prev) => !prev)} containerStyle={styles.checkItem} textStyle={styles.checkText} checkedColor={theme.colors.primary} />
          <CheckBox title="Парковка" checked={hasParking} onPress={() => setHasParking((prev) => !prev)} containerStyle={styles.checkItem} textStyle={styles.checkText} checkedColor={theme.colors.primary} />
          <CheckBox title="Питание" checked={hasMeals} onPress={() => setHasMeals((prev) => !prev)} containerStyle={styles.checkItem} textStyle={styles.checkText} checkedColor={theme.colors.primary} />
          <CheckBox title="Для семьи" checked={familyFriendly} onPress={() => setFamilyFriendly((prev) => !prev)} containerStyle={styles.checkItem} textStyle={styles.checkText} checkedColor={theme.colors.primary} />
          <CheckBox title="Можно с животными" checked={petFriendly} onPress={() => setPetFriendly((prev) => !prev)} containerStyle={styles.checkItem} textStyle={styles.checkText} checkedColor={theme.colors.primary} />
        </View>

        <Button title="Сохранить объект" onPress={saveProfile} loading={loading} containerStyle={{ marginTop: 20 }} />
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  backBtn: { padding: 10 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  label: { fontSize: 12, fontWeight: '700', marginLeft: 5, marginBottom: 10, textTransform: 'uppercase' },
  catContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  chipText: { fontWeight: '600', fontSize: 14 },
  geoBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  geoBtn: { padding: 10, backgroundColor: '#eee', borderRadius: 12 },
  checkGrid: { marginTop: 10 },
  checkItem: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, margin: 0 },
  checkText: { color: '#fff', fontWeight: '600' },
});
