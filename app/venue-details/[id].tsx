import { Button, Icon, Text, useTheme } from '@rneui/themed';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../../components/AppToast';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/push';
import { useAuth } from '../../providers/AuthProvider';

const zoneLabelMap: Record<string, string> = {
  akshi: 'Акши',
  koktuma: 'Коктума',
  usharal: 'Ушарал',
};

const coverFallback =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

type VenueProfile = {
  id: string;
  category_id?: number | null;
  location_zone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  description?: string | null;
  capacity?: number | null;
  price_from?: number | null;
  distance_to_beach_m?: number | null;
  has_wifi?: boolean | null;
  has_parking?: boolean | null;
  has_meals?: boolean | null;
  family_friendly?: boolean | null;
  pet_friendly?: boolean | null;
  season_open?: string | null;
  season_close?: string | null;
  avgRating?: string;
  profiles?: {
    full_name?: string | null;
    city?: string | null;
  } | null;
  categories?: {
    name?: string | null;
  } | null;
};

type PortfolioItem = {
  id?: string;
  file_url?: string | null;
  thumbnail_url?: string | null;
};

export default function VenueDetailScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const venueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [venue, setVenue] = useState<VenueProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [bookingMessage, setBookingMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [venueId]);

  const heroImage = portfolio[0]?.thumbnail_url || portfolio[0]?.file_url || coverFallback;

  const amenities = useMemo(
    () =>
      [
        venue?.has_wifi && 'Wi-Fi',
        venue?.has_parking && 'Парковка',
        venue?.has_meals && 'Питание',
        venue?.family_friendly && 'Для семьи',
        venue?.pet_friendly && 'Можно с животными',
      ].filter(Boolean) as string[],
    [venue]
  );

  async function fetchDetails() {
    if (!venueId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: venueData, error: venueError } = await supabase
        .from('venue_profiles')
        .select('*')
        .eq('id', venueId)
        .single();

      if (venueError) throw venueError;

      const [profileResult, categoryResult, reviewsResult, portfolioResult] = await Promise.all([
        supabase.from('profiles').select('full_name, city').eq('id', venueId).maybeSingle(),
        venueData?.category_id
          ? supabase.from('categories').select('name').eq('id', venueData.category_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('reviews').select('rating').eq('target_id', venueId),
        supabase
          .from('portfolio')
          .select('id, file_url, thumbnail_url')
          .eq('specialist_id', venueId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (reviewsResult.error) throw reviewsResult.error;
      if (portfolioResult.error) throw portfolioResult.error;

      const ratings = reviewsResult.data || [];
      const avgRating =
        ratings.length > 0
          ? (ratings.reduce((acc: number, review: any) => acc + Number(review.rating || 0), 0) / ratings.length).toFixed(1)
          : 'NEW';

      setVenue({
        ...(venueData as VenueProfile),
        profiles: profileResult.data,
        categories: categoryResult.data,
        avgRating,
      });
      setPortfolio(portfolioResult.data || []);
    } catch (error: any) {
      console.error(error.message);
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить объект');
    } finally {
      setLoading(false);
    }
  }

  function openMap() {
    if (!venue?.latitude || !venue?.longitude) {
      Alert.alert('Упс', 'Координаты не указаны');
      return;
    }

    const title = venue.profiles?.full_name || 'Зона отдыха';
    const url = Platform.select({
      ios: `maps:0,0?q=${venue.latitude},${venue.longitude}`,
      android: `geo:0,0?q=${venue.latitude},${venue.longitude}(${encodeURIComponent(title)})`,
      default: `https://maps.google.com/?q=${venue.latitude},${venue.longitude}`,
    });

    if (url) Linking.openURL(url).catch(() => Alert.alert('Ошибка', 'Не удалось открыть карту'));
  }

  async function handleShare() {
    if (!venue) return;

    try {
      await Share.share({
        message: `Посмотрите объект на Алаколе: ${venue.profiles?.full_name || 'Зона отдыха'}\n${venue.address || 'Адрес уточняется'}\nTaptym`,
      });
    } catch (error) {
      // share failed
    }
  }

  async function handleBooking() {
    if (!user?.id) {
      Alert.alert('Ошибка', 'Нужно войти в аккаунт');
      return;
    }

    if (!venueId) {
      Alert.alert('Ошибка', 'Объект не найден');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      Alert.alert('Ошибка', 'Выберите даты заезда и выезда');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        client_id: user.id,
        specialist_id: venueId,
        date_time: `${checkInDate} ${checkOutDate}`,
        message: bookingMessage || null,
        status: 'pending',
        booking_type: 'venue',
        guest_count: parseInt(guestCount, 10) || null,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
      });

      if (error) throw error;

      showToast({ type: 'success', title: 'Бронь отправлена!', message: 'Заведение получит уведомление' });
      setModalVisible(false);
      setBookingMessage('');
      setCheckInDate('');
      setCheckOutDate('');
      await sendPushNotification(venueId, 'Новая заявка на бронь! 🏨', `${user.user_metadata?.full_name || 'Гость'} хочет забронировать на ${checkInDate} — ${checkOutDate}`);
    } catch (error: any) {
      showToast({ type: 'error', title: 'Ошибка', message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.black, fontWeight: '800', marginBottom: 16 }}>Объект не найден</Text>
        <Button title="Назад" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFillObject} />
          <View style={styles.heroScrim} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <Icon name="arrow-left" type="feather" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Icon name="share" type="feather" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroTextBlock}>
            <View style={styles.tagRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{venue.categories?.name || 'Зона отдыха'}</Text>
              </View>
              {venue.location_zone ? (
                <View style={[styles.heroBadge, styles.zoneBadge]}>
                  <Text style={[styles.heroBadgeText, styles.zoneBadgeText]}>
                    {zoneLabelMap[venue.location_zone] || venue.location_zone}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.heroTitle}>{venue.profiles?.full_name || 'Зона отдыха'}</Text>
            {venue.address ? (
              <View style={styles.heroAddressRow}>
                <Icon name="map-pin" type="feather" size={15} color="#E5E7EB" />
                <Text style={styles.heroAddress} numberOfLines={2}>
                  {venue.address}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statsPanel}>
            <TouchableOpacity style={styles.statItem} onPress={openMap}>
              <Icon name="map-pin" type="feather" size={20} color="#9B2CFF" />
              <Text style={styles.statValue}>Карта</Text>
              <Text style={styles.statLabel}>Открыть</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="users" type="feather" size={20} color="#9B2CFF" />
              <Text style={styles.statValue}>{venue.capacity || 0}</Text>
              <Text style={styles.statLabel}>Мест</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="star" type="font-awesome" size={20} color="#FFD700" />
              <Text style={styles.statValue}>{venue.avgRating}</Text>
              <Text style={styles.statLabel}>Рейтинг</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>Цена от</Text>
              <Text style={styles.metaValue}>{venue.price_from ? `${venue.price_from.toLocaleString('ru-RU')} ₸` : 'По запросу'}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>До берега</Text>
              <Text style={styles.metaValue}>{venue.distance_to_beach_m ? `${venue.distance_to_beach_m} м` : 'Не указано'}</Text>
            </View>
          </View>

          {amenities.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Удобства</Text>
              <View style={styles.amenityRow}>
                {amenities.map((item) => (
                  <View key={item} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {venue.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Об объекте</Text>
              <Text style={styles.description}>{venue.description}</Text>
            </View>
          ) : null}

          {(venue.season_open || venue.season_close) && (
            <View style={styles.seasonCard}>
              <Icon name="calendar" type="feather" size={18} color="#0F766E" />
              <Text style={styles.seasonText}>
                Сезон: {venue.season_open || 'не указано'} - {venue.season_close || 'не указано'}
              </Text>
            </View>
          )}

          {portfolio.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Галерея</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {portfolio.map((image, index) => (
                  <Image
                    key={image.id || index}
                    source={{ uri: image.thumbnail_url || image.file_url || coverFallback }}
                    style={styles.galleryImg}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity onPress={() => router.push(`/chat/${venueId}`)} style={styles.chatBtn}>
          <Icon name="message-circle" type="feather" color="#9B2CFF" size={25} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.bookBtnText}>Забронировать</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Бронь зоны отдыха</Text>
              <Text style={styles.modalLabel}>Дата заезда</Text>
              <Calendar
                onDayPress={(day: any) => setCheckInDate(day.dateString)}
                markedDates={checkInDate ? { [checkInDate]: { selected: true, selectedColor: '#9B2CFF' } } : {}}
                theme={{ calendarBackground: 'transparent', dayTextColor: '#F8FAFC', monthTextColor: '#F8FAFC', arrowColor: '#22E7C8' }}
              />
              <Text style={[styles.modalLabel, { marginTop: 12 }]}>Дата выезда</Text>
              <Calendar
                onDayPress={(day: any) => setCheckOutDate(day.dateString)}
                markedDates={checkOutDate ? { [checkOutDate]: { selected: true, selectedColor: '#0EA5E9' } } : {}}
                theme={{ calendarBackground: 'transparent', dayTextColor: '#F8FAFC', monthTextColor: '#F8FAFC', arrowColor: '#22E7C8' }}
              />
              <TextInput
                value={guestCount}
                onChangeText={setGuestCount}
                keyboardType="numeric"
                placeholder="Количество гостей"
                placeholderTextColor="#8E879A"
                style={styles.input}
              />
              <TextInput
                value={bookingMessage}
                onChangeText={setBookingMessage}
                placeholder="Комментарий, например номер телефона или пожелания"
                placeholderTextColor="#8E879A"
                multiline
                style={[styles.input, styles.textArea]}
              />
              <Button
                title="Отправить заявку"
                loading={submitting}
                buttonStyle={styles.modalSubmit}
                titleStyle={{ fontWeight: '900' }}
                onPress={handleBooking}
              />
              <Button title="Отмена" type="clear" titleStyle={{ color: '#A8A0B5' }} onPress={() => setModalVisible(false)} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0814' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1, backgroundColor: '#0D0814' },
  hero: {
    minHeight: 365,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 6, 14, 0.5)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextBlock: { gap: 12 },
  tagRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26, 19, 36, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  heroBadgeText: { fontSize: 13, color: '#22E7C8', fontWeight: '900' },
  zoneBadge: { backgroundColor: 'rgba(34, 231, 200, 0.14)', borderColor: 'rgba(34, 231, 200, 0.3)' },
  zoneBadgeText: { color: '#7CF7E5' },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
  },
  heroAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    maxWidth: '92%',
  },
  heroAddress: {
    color: '#E5E7EB',
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  content: {
    backgroundColor: '#0D0814',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  statsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2329',
    borderWidth: 1,
    borderColor: '#2B3139',
    borderRadius: 24,
    paddingVertical: 22,
    marginBottom: 18,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statDivider: { width: 1, height: 64, backgroundColor: 'rgba(255,255,255,0.5)' },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#A8A0B5', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metaCard: { flex: 1, backgroundColor: '#1E2329', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2B3139' },
  metaTitle: { color: '#A8A0B5', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  metaValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  section: { marginTop: 4, marginBottom: 20 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 12 },
  description: { color: '#D8D3E2', lineHeight: 23, fontSize: 15, fontWeight: '500' },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  amenityChip: {
    backgroundColor: 'rgba(34, 231, 200, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34, 231, 200, 0.22)',
  },
  amenityText: { color: '#7CF7E5', fontWeight: '900', fontSize: 13 },
  seasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34, 231, 200, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 231, 200, 0.2)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  seasonText: { color: '#7CF7E5', fontSize: 14, fontWeight: '800', flex: 1 },
  galleryRow: { gap: 12, paddingRight: 24 },
  galleryImg: { width: 176, height: 220, borderRadius: 20, backgroundColor: '#1E2329' },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2B3139',
    gap: 14,
    backgroundColor: '#0B0E11',
  },
  chatBtn: {
    width: 64,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B3139',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0B90B',
  },
  bookBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', padding: 20, borderRadius: 28, maxHeight: '92%', backgroundColor: '#1E2329', borderWidth: 1, borderColor: '#2B3139' },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalLabel: { color: '#A8A0B5', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: {
    color: '#FFFFFF',
    borderColor: '#2B3139',
    backgroundColor: '#0B0E11',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    fontWeight: '700',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  modalSubmit: { backgroundColor: '#F0B90B', borderRadius: 16, marginTop: 20, height: 55 },
});
