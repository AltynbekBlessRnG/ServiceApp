import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/AppToast';
import { useAuth } from '../../providers/AuthProvider';
import { ProviderVerificationBanner } from '../../components/ProviderVerificationBanner';

export default function SpecialistHome() {
  const { theme } = useTheme();
  const { user, providerVerificationStatus } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. БЛОКИРОВКА КНОПКИ НАЗАД
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Выход', 'Закрыть приложение?', [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Да', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, client:profiles!client_id (full_name, avatar_url)`)
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false });

    if (error) showToast({ type: 'error', title: 'Не удалось загрузить заказы', message: error.message });
    else setBookings(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { void fetchBookings(); }, [fetchBookings]));

  // 2. ОБНОВЛЕНИЕ СТАТУСА + УВЕДОМЛЕНИЕ
  async function updateStatus(id: string, status: 'confirmed' | 'rejected' | 'completed') {
    // Оптимистичное обновление UI
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    
    // Обновляем базу
    const { error } = await supabase.rpc('transition_booking', { p_booking_id: id, p_status: status });
    if (error) {
      await fetchBookings();
      showToast({ type: 'error', title: 'Не удалось изменить статус', message: error.message });
      return;
    }

    // Готовим текст уведомления
    let title = '';
    let body = '';

    if (status === 'confirmed') {
        title = 'Заказ подтвержден! ✅';
        body = 'Мастер принял вашу запись. Ждем вас в назначенное время.';
    } else if (status === 'rejected') {
        title = 'Заказ отклонен ❌';
        body = 'К сожалению, мастер не может принять вас в это время.';
    } else if (status === 'completed') {
        title = 'Заказ завершен 🎉';
        body = 'Спасибо, что выбрали нас! Не забудьте оставить отзыв.';
    }

    if (title) {
        showToast({ type: status === 'confirmed' ? 'success' : status === 'rejected' ? 'error' : 'info', title, message: body });
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const isPending = item.status === 'pending';
    const startsAt = new Date(item.starts_at);
    const canComplete = startsAt.getTime() <= Date.now();
    const date = startsAt.toLocaleDateString('ru-RU');
    const time = startsAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const statusLabel = item.status === 'pending' ? 'ОЖИДАЕТ' : item.status === 'confirmed' ? 'ПОДТВЕРЖДЕНО' : item.status === 'completed' ? 'ЗАВЕРШЕНО' : 'ОТКЛОНЕНО';

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]}>
        
        {/* ХЕДЕР КАРТОЧКИ (Время и Статус) */}
        <View style={styles.cardHeader}>
            <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.black }}>{time}</Text>
                <Text style={{ fontSize: 13, color: theme.colors.grey2, fontWeight: '600' }}>{date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#10B98120' : '#10B981' }]}>
                <Text style={[styles.statusText, { color: item.status === 'completed' ? '#10B981' : '#fff' }]}>
                    {statusLabel}
                </Text>
            </View>
        </View>

        {/* ДАННЫЕ КЛИЕНТА */}
        <View style={styles.clientRow}>
            <UserAvatar avatarUrl={item.client?.avatar_url} size={50} />
            <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.clientName, { color: theme.colors.black }]}>{item.client?.full_name}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.grey2 }}>Клиент</Text>
            </View>
            <TouchableOpacity 
                style={[styles.chatBtn, { backgroundColor: theme.colors.grey1 }]}
                onPress={() => router.push(`/chat/${item.client_id}`)}
            >
                <Icon name="message-circle" type="feather" size={20} color="#10B981" />
            </TouchableOpacity>
        </View>

        {/* 3. КОММЕНТАРИЙ КЛИЕНТА (ЕСЛИ ЕСТЬ) */}
        {item.message && item.message.trim() !== '' && (
            <View style={styles.msgBox}>
                <Icon name="file-text" type="feather" size={14} color={theme.colors.grey2} style={{marginTop: 2}} />
                <Text style={styles.msgText}>{item.message}</Text>
            </View>
        )}

        {/* КНОПКИ ДЕЙСТВИЙ */}
        <View style={styles.actionRow}>
            {isPending ? (
                <>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF444420', flex: 1, marginRight: 10 }]} onPress={() => updateStatus(item.id, 'rejected')}>
                        <Text style={{ color: '#EF4444', fontWeight: '800' }}>ОТКЛОНИТЬ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981', flex: 1 }]} onPress={() => updateStatus(item.id, 'confirmed')}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>ПРИНЯТЬ</Text>
                    </TouchableOpacity>
                </>
            ) : item.status === 'confirmed' && (
                <TouchableOpacity disabled={!canComplete} style={[styles.btn, { backgroundColor: canComplete ? '#10B981' : theme.colors.grey1, flex: 1 }]} onPress={() => updateStatus(item.id, 'completed')}>
                    <Icon name="check" type="feather" color="#fff" size={18} style={{marginRight: 8}} />
                    <Text style={{ color: canComplete ? '#fff' : theme.colors.grey2, fontWeight: '800' }}>{canComplete ? 'ЗАВЕРШИТЬ' : 'ДОЖДИТЕСЬ НАЧАЛА'}</Text>
                </TouchableOpacity>
            )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View>
            <Text style={{ color: theme.colors.grey2, fontWeight: '600', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Рабочий стол</Text>
            <Text h3 style={{ color: '#FFFFFF', fontWeight: '900' }}>Заказы</Text>
        </View>
        <View style={styles.headerActions}>
            <TouchableOpacity 
                style={[styles.iconBtn, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]} 
                onPress={() => router.push('/settings')}
            >
                <Icon name="settings" type="feather" size={22} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
      </View>

      <ProviderVerificationBanner status={providerVerificationStatus} />

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchBookings();}} tintColor="#10B981" />}
          ListEmptyComponent={
            <View style={styles.empty}>
                <Icon name="inbox" type="feather" size={60} color={theme.colors.grey1} />
                <Text style={{ color: theme.colors.grey2, marginTop: 15, fontWeight: '600' }}>Новых заказов нет</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 25, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  card: { borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  clientName: { fontSize: 16, fontWeight: '700' },
  chatBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  
  // Стиль для сообщения
  msgBox: { 
      flexDirection: 'row', 
      backgroundColor: 'rgba(255,255,255,0.05)', 
      padding: 12, 
      borderRadius: 12, 
      marginBottom: 20, 
      gap: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
  },
  msgText: { color: '#ccc', fontSize: 13, fontStyle: 'italic', flex: 1 },

  actionRow: { flexDirection: 'row' },
  btn: { height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  empty: { alignItems: 'center', marginTop: 100 }
});
