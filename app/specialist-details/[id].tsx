import { Button, Chip, Icon, Input, Text, useTheme } from '@rneui/themed';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet, TouchableOpacity, View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { showToast } from '../../components/AppToast';
import { UserAvatar } from '../../components/UserAvatar';
import { SafetyActions } from '../../components/SafetyActions';
import { useHaptics } from '../../hooks/useHaptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

const WORK_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export default function SpecialistDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // 1. ПОЛУЧАЕМ ДАННЫЕ ИЗ ССЫЛКИ (Они доступны МГНОВЕННО)
  const params = useLocalSearchParams();
  const targetId = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedServiceId = Array.isArray(params.serviceId) ? params.serviceId[0] : params.serviceId;
  
  // Данные для "Мгновенного рендера"
  const initialName = params.full_name as string || 'Загрузка...';
  const initialAvatar = params.avatar_url as string || null;
  const initialCategory = params.category_name as string || '';
  const initialPrice = params.price_start as string || '';

  const [specialist, setSpecialist] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Loading теперь отвечает только за "тяжелые" данные
  const [loading, setLoading] = useState(true);

  // Бронирование
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [busyDates, setBusyDates] = useState<any>({});
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const haptics = useHaptics();

  const loadData = useCallback(async () => {
    // Не блокируем экран! Пользователь уже видит имя и аватар
    try {
      const [specReq, portReq, revReq, busyReq, favReq] = await Promise.all([
          supabase.from('provider_search_view').select('*').eq('id', targetId).limit(1).maybeSingle(),
          supabase.from('portfolio_items').select('*').eq('owner_id', targetId).eq('is_hidden', false).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(12),
          supabase.from('reviews').select('*, client:profiles!client_id(full_name, avatar_url)').eq('target_id', targetId).order('created_at', { ascending: false }).limit(5),
          supabase.rpc('get_provider_unavailable_intervals', {
            p_provider_id: targetId,
            p_from: new Date().toISOString(),
            p_to: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          user ? supabase.from('favorites').select('target_id').eq('user_id', user.id).eq('target_id', targetId).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (specReq.data) setSpecialist(specReq.data);
      
      if (portReq.data && portReq.data.length > 0) {
          setPortfolio(portReq.data);
          const customHero = portReq.data.find((item: any) => item.is_hero);
          setHeroImage(customHero?.file_url || portReq.data[0].file_url);
      }

      if (revReq.data) setReviews(revReq.data);
      
      if (busyReq.data) {
          const marks: any = {};
          busyReq.data.forEach((d: any) => {
            const date = new Date(d.starts_at).toISOString().slice(0, 10);
            marks[date] = { marked: true, dotColor: '#F6465D' };
          });
          setBusyDates(marks);
      }

      if (favReq.data) setIsFavorite(!!favReq.data);

    } catch (e) { console.error(e); }
    setLoading(false);
  }, [targetId, user]);

  useEffect(() => {
    if (targetId) void loadData();
  }, [loadData, targetId]);

  const handleShare = async () => {
      const name = specialist?.full_name || initialName;
      await Share.share({ message: `Посмотри специалиста: ${name} в Taptym.` });
  };

  async function onDateSelect(day: any) {
    setSelectedDate(day.dateString);
    setSelectedTime(''); 
    // Грузим занятость только при клике на дату (экономим трафик)
    const dayStart = new Date(`${day.dateString}T00:00:00`);
    const dayEnd = new Date(`${day.dateString}T23:59:59.999`);
    const { data } = await supabase.rpc('get_provider_unavailable_intervals', {
      p_provider_id: targetId,
      p_from: dayStart.toISOString(),
      p_to: dayEnd.toISOString(),
    });
    const formatTime = (value: string) => {
      const date = new Date(value);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };
    setBusySlots(data?.map((interval: { starts_at: string }) => formatTime(interval.starts_at)) || []);
  }

  async function handleBooking() {
    if (!user) return router.push('/(auth)/login');
    setBookingLoading(true);
    let serviceId = Number(requestedServiceId);
    if (!Number.isFinite(serviceId)) {
      const { data: providerService } = await supabase
        .from('provider_services')
        .select('service_id')
        .eq('provider_id', targetId)
        .limit(1)
        .maybeSingle();
      serviceId = Number(providerService?.service_id);
    }
    if (!Number.isFinite(serviceId) || !selectedDate || !selectedTime) {
      setBookingLoading(false);
      return showToast({ type: 'error', title: 'Ошибка', message: 'Выберите услугу, дату и время' });
    }
    const { error } = await supabase.rpc('create_appointment', {
      p_provider_id: targetId,
      p_service_id: serviceId,
      p_starts_at: new Date(`${selectedDate}T${selectedTime}:00`).toISOString(),
      p_message: bookingMessage || undefined,
    });
    setBookingLoading(false);
    if (!error) { 
      haptics.success(); 
      showToast({ type: 'success', title: 'Заявка отправлена!', message: 'Специалист получит уведомление' }); 
      setModalVisible(false); setBookingMessage(''); 
    } 
    else { haptics.error(); showToast({ type: 'error', title: 'Ошибка', message: error.message }); }
  }

  async function toggleFavorite() {
    haptics.medium();
    if (!user) return Alert.alert("Вход", "Сначала авторизуйтесь");
    const previousValue = isFavorite;
    setIsFavorite(!previousValue);
    const { error } = previousValue
      ? await supabase.from('favorites').delete().eq('user_id', user.id).eq('target_id', targetId)
      : await supabase.from('favorites').insert({ user_id: user.id, target_id: targetId });
    if (error) {
      setIsFavorite(previousValue);
      haptics.error();
      showToast({ type: 'error', title: 'Не удалось обновить избранное', message: error.message });
    }
  }

  // 🔥 МЫ УБРАЛИ БЛОКИРУЮЩИЙ RETURN. ЭКРАН РЕНДЕРИТСЯ СРАЗУ.

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingTop: insets.top }}>
        <AppHeader 
            title="Профиль" 
            rightComponent={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <TouchableOpacity onPress={handleShare}><Icon name="share" type="feather" color="#fff" size={22} /></TouchableOpacity>
                    <TouchableOpacity onPress={toggleFavorite}><Icon name={isFavorite ? "heart" : "heart-o"} type="font-awesome" color={isFavorite ? "#ff4757" : "#fff"} /></TouchableOpacity>
                </View>
            } 
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* HERO: Показываем картинку сразу, или placeholder */}
        <Image 
            source={{ uri: heroImage || 'https://via.placeholder.com/800x600/1A1625/FFFFFF?text=Taptym' }} 
            style={styles.heroImg} 
            contentFit="cover"
            transition={300}
        />
        
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.headerSection}>
                <View style={[styles.avatarBorder, { borderColor: theme.colors.background }]}>
                    {/* Показываем аватар из params СРАЗУ */}
                    <UserAvatar avatarUrl={specialist?.avatar_url || initialAvatar} size={90} />
                </View>
                
                {/* Показываем имя из params СРАЗУ */}
                <Text h4 style={{ color: '#fff', marginTop: 10, textAlign: 'center' }}>
                    {specialist?.full_name || initialName}
                </Text>
                <Text style={{ color: '#F0B90B', fontWeight: '700', marginTop: 4 }}>
                    {specialist?.category_name || initialCategory}
                </Text>
                
                <View style={[styles.statsRow, { borderColor: '#2B3139' }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#fff' }]}>{specialist?.experience_years ?? '-'} лет</Text>
                        <Text style={styles.statLabel}>Опыт</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: '#2B3139' }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#fff' }]}>⭐ {Number(specialist?.avg_rating || 0).toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Рейтинг</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: '#2B3139' }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#fff' }]}>{specialist?.price_start ?? initialPrice} ₸</Text>
                        <Text style={styles.statLabel}>Цена от</Text>
                    </View>
                </View>

                {/* Описание и Портфолио грузятся позже, поэтому тут можно показать скелетон или спиннер */}
                {loading ? (
                    <ActivityIndicator size="small" color="#F0B90B" style={{ marginTop: 20 }} />
                ) : (
                    <Text style={[styles.bio, { color: '#fff' }]}>{specialist?.bio || 'Мастер не добавил описание.'}</Text>
                )}
            </View>

            {/* ГАЛЕРЕЯ */}
            {!loading && portfolio.length > 0 && (
                <View style={styles.section}>
                    <Text h4 style={[styles.sectionTitle, { color: '#fff' }]}>Портфолио</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {portfolio.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => setSelectedMedia(item)}>
                                <View style={[styles.portItem, item.is_pinned && { borderColor: '#F0B90B', borderWidth: 2 }]}>
                                    <Image source={{ uri: item.thumbnail_url || item.file_url }} style={styles.portImg} contentFit="cover" cachePolicy="memory-disk"/>
                                    {item.file_type === 'video' && <View style={styles.videoBadge}><Icon name="play" type="feather" color="#fff" size={14} /></View>}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ОТЗЫВЫ */}
            {!loading && (
                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text h4 style={[styles.sectionTitle, { color: '#fff' }]}>Отзывы ({reviews.length})</Text>
                    </View>
                    {reviews.map((r) => (
                        <View key={r.id} style={[styles.reviewCard, { backgroundColor: '#1E2329' }]}>
                            <UserAvatar avatarUrl={r.client?.avatar_url} size={40} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={styles.rowBetween}>
                                    <Text style={{ fontWeight: 'bold', color: '#fff' }}>{r.client?.full_name}</Text>
                                    <View style={{ flexDirection: 'row' }}><Icon name="star" type="font-awesome" size={12} color="#FFD700" /></View>
                                </View>
                                <Text style={{ color: '#fff', marginTop: 4, opacity: 0.8 }}>{r.comment}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
            <SafetyActions targetId={targetId} />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: '#2B3139' }]}>
          <TouchableOpacity style={[styles.chatBtn, { borderColor: '#2B3139' }]} onPress={() => router.push(`/chat/${targetId}`)}>
              <Icon name="message-circle" type="feather" color="#F0B90B" size={24} />
          </TouchableOpacity>
          <Button title="Записаться" onPress={() => setModalVisible(true)} buttonStyle={{ backgroundColor: theme.colors.primary, borderRadius: 16, height: 56 }} containerStyle={{ flex: 1 }} />
      </View>

      {/* MODAL MEDIA */}
      <Modal visible={!!selectedMedia} transparent animationType="fade">
          <View style={styles.modalBg}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMedia(null)}><Icon name="x" type="feather" color="white" size={30} /></TouchableOpacity>
              {selectedMedia && (
                  selectedMedia.file_type === 'video' ? (
                      <Video source={{ uri: selectedMedia.file_url }} style={styles.fullImg} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping shouldPlay />
                  ) : (
                      <Image source={{ uri: selectedMedia.file_url }} style={styles.fullImg} contentFit="contain" />
                  )
              )}
          </View>
      </Modal>

      {/* MODAL BOOKING */}
      <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: '#1E2329' }]}>
                  <Text h4 style={{ textAlign: 'center', marginBottom: 15, color: '#fff' }}>Дата и время</Text>
                   <Calendar onDayPress={onDateSelect} markedDates={{ ...busyDates, [selectedDate]: { selected: true, selectedColor: theme.colors.primary } }} theme={{ calendarBackground: 'transparent', dayTextColor: '#fff', monthTextColor: '#fff', arrowColor: theme.colors.primary, todayTextColor: '#F0B90B' }} />
                  {selectedDate ? (
                      <View style={{ marginTop: 15 }}>
                          <Text style={{ marginBottom: 10, color: 'gray' }}>Свободное время:</Text>
                          <View style={styles.chipsRow}>
                              {WORK_HOURS.map(time => (
                                  <Chip key={time} title={time} disabled={busySlots.includes(time)} type={selectedTime === time ? 'solid' : 'outline'} onPress={() => setSelectedTime(time)} containerStyle={{ margin: 3 }} buttonStyle={selectedTime === time ? { backgroundColor: theme.colors.primary } : { borderColor: '#2D2638' }} titleStyle={selectedTime === time ? { color: '#fff' } : { color: '#fff' }} />
                              ))}
                          </View>
                          <Input placeholder="Комментарий (необязательно)" value={bookingMessage} onChangeText={setBookingMessage} containerStyle={{ marginTop: 15, paddingHorizontal: 0 }} inputContainerStyle={{ borderBottomWidth: 0, backgroundColor: theme.colors.background, borderRadius: 12, paddingHorizontal: 10 }} inputStyle={{ color: '#fff', fontSize: 14 }} />
                      </View>
                  ) : null}
                  <Button title="Подтвердить" loading={bookingLoading} disabled={!selectedTime} onPress={handleBooking} containerStyle={{ marginTop: 10 }} buttonStyle={{ borderRadius: 12 }} />
                  <Button title="Отмена" type="clear" onPress={() => setModalVisible(false)} titleStyle={{color: '#FF4757'}} />
              </View>
          </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImg: { width: '100%', height: 250, opacity: 0.9 },
  contentContainer: { marginTop: -40, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingBottom: 20 },
  headerSection: { alignItems: 'center', marginBottom: 20 },
  avatarBorder: { marginTop: -50, borderWidth: 5, borderRadius: 50 },
  statsRow: { flexDirection: 'row', marginTop: 20, borderWidth: 1, borderRadius: 16, padding: 15, width: '100%', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: '100%' },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, color: 'gray', textTransform: 'uppercase', marginTop: 2 },
  bio: { textAlign: 'center', marginTop: 15, lineHeight: 22, opacity: 0.8 },
  section: { marginTop: 30 },
  sectionTitle: { marginBottom: 15, fontSize: 18, fontWeight: '800' },
  portItem: { position: 'relative', borderRadius: 16, overflow: 'hidden' },
  portImg: { width: 130, height: 180 },
  videoBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  reviewCard: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 12 },
  footer: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', padding: 16, paddingBottom: 30, borderTopWidth: 1, gap: 12 },
  chatBtn: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImg: { width: '100%', height: '80%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
