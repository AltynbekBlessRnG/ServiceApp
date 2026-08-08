
import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { ProviderVerificationBanner } from '../../components/ProviderVerificationBanner';

export default function VenueHome() {
  const { theme } = useTheme();
  const { user, isLoading, providerVerificationStatus } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Выход', 'Выйти из приложения?', [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Выйти', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const fetchBookings = React.useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('bookings').select(`*, client:profiles!client_id (full_name, avatar_url)`).eq('provider_id', user.id).order('created_at', { ascending: false });
    if (error) Alert.alert('Не удалось загрузить брони', error.message);
    else setBookings(data || []);
    setRefreshing(false);
  }, [user]);

  async function updateStatus(id: string, status: 'confirmed' | 'rejected' | 'completed') {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    const { error } = await supabase.rpc('transition_booking', { p_booking_id: id, p_status: status });
    if (error) {
      await fetchBookings();
      Alert.alert('Ошибка', error.message);
      return;
    }
  }

  useFocusEffect(React.useCallback(() => {
    if (!isLoading && user) void fetchBookings();
  }, [fetchBookings, isLoading, user]));

  const renderItem = ({ item }: { item: any }) => {
    const startsAt = new Date(item.starts_at);
    const canComplete = startsAt.getTime() <= Date.now();
    const date = item.ends_at
      ? `${startsAt.toLocaleDateString('ru-RU')} — ${new Date(item.ends_at).toLocaleDateString('ru-RU')}`
      : startsAt.toLocaleDateString('ru-RU');
    const time = item.kind === 'stay'
      ? `${item.guest_count || 1} гост.`
      : startsAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]}>
        <View style={styles.cardHeader}>
            <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.black }}>{time}</Text>
                <Text style={{ fontSize: 13, color: theme.colors.grey2, fontWeight: '600' }}>{date}</Text>
            </View>
            <View style={[styles.statusBadge, { 
                backgroundColor: item.status === 'confirmed' ? '#10B98120' : item.status === 'rejected' ? '#EF444420' : item.status === 'completed' ? '#3B82F620' : '#F59E0B20',
                borderColor: item.status === 'confirmed' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : item.status === 'completed' ? '#3B82F6' : '#F59E0B'
            }]}><Text style={[styles.statusText, { 
                color: item.status === 'confirmed' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : item.status === 'completed' ? '#3B82F6' : '#F59E0B'
            }]}>{item.status.toUpperCase()}</Text></View>
        </View>

        <View style={styles.clientRow}>
            <UserAvatar avatarUrl={item.client?.avatar_url} size={50} />
            <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.clientName, { color: theme.colors.black }]}>{item.client?.full_name}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.grey2 }}>Гость Nexus</Text>
            </View>
            <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/chat/${item.client_id}`)}>
                <Icon name="message-circle" type="feather" size={20} color="#10B981" />
            </TouchableOpacity>
        </View>

        {item.status === 'pending' && (
            <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF444420', flex: 1, marginRight: 10 }]} onPress={() => updateStatus(item.id, 'rejected')}>
                    <Text style={{ color: '#EF4444', fontWeight: '800' }}>НЕТ МЕСТ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981', flex: 1 }]} onPress={() => updateStatus(item.id, 'confirmed')}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>ПРИНЯТЬ</Text>
                </TouchableOpacity>
            </View>
        )}
        {item.status === 'confirmed' && (
            <View style={styles.actionRow}>
                <TouchableOpacity disabled={!canComplete} style={[styles.btn, { backgroundColor: canComplete ? '#3B82F6' : theme.colors.grey1, flex: 1 }]} onPress={() => updateStatus(item.id, 'completed')}>
                    <Text style={{ color: canComplete ? '#fff' : theme.colors.grey2, fontWeight: '800' }}>{canComplete ? 'ЗАВЕРШИТЬ' : 'ДОЖДИТЕСЬ НАЧАЛА'}</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0B0E11', paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View>
            <Text style={{ color: theme.colors.grey2, fontWeight: '600', textTransform: 'uppercase', fontSize: 11 }}>Управление</Text>
            <Text h3 style={{ color: '#FFFFFF', fontWeight: '900' }}>Брони</Text>
        </View>
        <TouchableOpacity 
             style={[styles.iconBtn, { backgroundColor: '#1E293B', borderColor: '#334155' }]} 
             onPress={() => router.push('/settings')}
        >
             <Icon name="settings" type="feather" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ProviderVerificationBanner status={providerVerificationStatus} />

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor="#10B981" />}
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
                <Icon name="calendar" type="feather" size={50} color="#2B3139" />
                <Text style={{ color: '#6B6675', marginTop: 15, fontWeight: '600', fontSize: 16 }}>Нет бронирований</Text>
                <Text style={{ color: '#4B5563', marginTop: 5, fontSize: 13 }}>Заявки появятся здесь</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 25, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  card: { borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '900', color: '#10B981' },
  clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  clientName: { fontSize: 16, fontWeight: '700' },
  chatBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  actionRow: { flexDirection: 'row' },
  btn: { height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }
});
