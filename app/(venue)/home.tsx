
import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar';
import { sendPushNotification } from '../../lib/push';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function VenueHome() {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
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

  useFocusEffect(React.useCallback(() => { if (!isLoading && user) fetchBookings(); }, [user, isLoading]));

  async function fetchBookings() {
    if (!user) return;
    const { data } = await supabase.from('bookings').select(`*, client:profiles!client_id (full_name, avatar_url, phone)`).eq('specialist_id', user.id).order('created_at', { ascending: false });
    setBookings(data || []); setLoadingData(false); setRefreshing(false);
  }

  async function updateStatus(id: string, clientId: string, status: string) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    await supabase.from('bookings').update({ status }).eq('id', id);

    let title = '';
    let body = '';
    if (status === 'confirmed') {
      title = 'Бронь подтверждена! ✅';
      body = 'Заведение приняло вашу заявку. Ждем вас!';
    } else if (status === 'rejected') {
      title = 'Бронь отклонена ❌';
      body = 'К сожалению, заведение не может принять вас в это время.';
    } else if (status === 'completed') {
      title = 'Бронь завершена 🎉';
      body = 'Спасибо, что выбрали нас! Не забудьте оставить отзыв.';
    }
    if (title && clientId) {
      await sendPushNotification(clientId, title, body);
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const [date, time] = item.date_time.split(' ');
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]}>
        <View style={styles.cardHeader}>
            <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.black }}>{time}</Text>
                <Text style={{ fontSize: 13, color: theme.colors.grey2, fontWeight: '600' }}>{date}</Text>
            </View>
            <View style={styles.statusBadge}><Text style={styles.statusText}>{item.status.toUpperCase()}</Text></View>
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
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF444420', flex: 1, marginRight: 10 }]} onPress={() => updateStatus(item.id, item.client_id, 'rejected')}>
                    <Text style={{ color: '#EF4444', fontWeight: '800' }}>НЕТ МЕСТ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981', flex: 1 }]} onPress={() => updateStatus(item.id, item.client_id, 'confirmed')}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>ПРИНЯТЬ</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0F172A', paddingTop: insets.top + 10 }]}>
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

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor="#10B981" />}
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
