import { Button, Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader'; // <---
import { UserAvatar } from '../../components/UserAvatar'; // <---
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

interface BookingItem {
    id: string;
    date_time: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'completed';
    message: string;
    specialist: {
        id: string;
        full_name: string;
        avatar_url: string | null;
        category_name?: string;
    };
}

export default function ClientOrdersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [orders, setOrders] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BookingItem | null>(null);

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  async function fetchOrders() {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select(`id, date_time, status, message, specialist:profiles!specialist_id (id, full_name, avatar_url)`)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data as any);
    setLoading(false);
    setRefreshing(false);
  }

  const getStatusConfig = (status: string) => {
    switch(status) {
        case 'confirmed': return { label: 'Подтверждено', color: '#10B981', bg: '#10B98115', icon: 'check-circle' };
        case 'rejected': return { label: 'Отменено', color: theme.colors.error, bg: theme.colors.error + '15', icon: 'x-circle' };
        case 'completed': return { label: 'Завершено', color: theme.colors.grey2, bg: theme.colors.grey1, icon: 'check' };
        default: return { label: 'Ожидает', color: '#F59E0B', bg: '#FFFBEB', icon: 'clock' };
    }
  };

  const renderItem = ({ item }: { item: BookingItem }) => {
    const status = getStatusConfig(item.status);
    const [date, time] = item.date_time.split(' ');
    
    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => setSelectedOrder(item)}
        style={[styles.card, { backgroundColor: theme.colors.grey0 }]}
      >
        <View style={styles.cardTop}>
            <View style={styles.dateBlock}>
                <Text style={[styles.dateText, { color: theme.colors.black }]}>{date}</Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>{time}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Icon name={status.icon} type="feather" size={12} color={status.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileRow}>
            <UserAvatar avatarUrl={item.specialist?.avatar_url} size={45} />
            <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.specName, { color: theme.colors.black }]}>{item.specialist?.full_name}</Text>
                <Text style={styles.subText}>Специалист</Text>
            </View>
            <Icon name="chevron-right" type="feather" color={theme.colors.grey2} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader title="Мои записи" showBack={false} />

      {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
          <FlatList
              data={orders}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchOrders();}} tintColor={theme.colors.primary} />}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                    <Icon name="calendar" type="feather" size={60} color={theme.colors.grey2} />
                    <Text style={styles.emptyText}>История записей пуста</Text>
                    <Button 
                        title="Найти мастера" 
                        type="outline" 
                        onPress={() => router.push('/(client)/home')}
                        containerStyle={{ marginTop: 20, width: 200 }}
                    />
                </View>
              }
          />
      )}

      {/* МОДАЛКА С ДЕТАЛЯМИ */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                  <View style={styles.modalHeader}>
                      <Text h4 style={{ color: theme.colors.black }}>Детали записи</Text>
                      <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                          <Icon name="x" type="feather" color={theme.colors.grey2} />
                      </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.detailBox, { backgroundColor: theme.colors.grey0 }]}>
                      <View style={{ alignItems: 'center', marginBottom: 20 }}>
                          <UserAvatar avatarUrl={selectedOrder?.specialist?.avatar_url} size={80} />
                          <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 10, color: theme.colors.black }}>
                              {selectedOrder?.specialist?.full_name}
                          </Text>
                      </View>

                      <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Дата</Text>
                          <Text style={[styles.infoValue, { color: theme.colors.black }]}>{selectedOrder?.date_time}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Статус</Text>
                          <Text style={[styles.infoValue, { color: getStatusConfig(selectedOrder?.status || '').color }]}>
                              {getStatusConfig(selectedOrder?.status || '').label}
                          </Text>
                      </View>

                      {selectedOrder?.message && (
                          <View style={{ marginTop: 15 }}>
                              <Text style={styles.infoLabel}>Комментарий</Text>
                              <Text style={{ color: theme.colors.grey2, fontStyle: 'italic', marginTop: 5 }}>
                                  {selectedOrder.message}
                              </Text>
                          </View>
                      )}
                  </View>

                  <Button 
                    title="Написать в чат" 
                    icon={<Icon name="message-circle" type="feather" color="#fff" style={{ marginRight: 10 }} />}
                    onPress={() => { setSelectedOrder(null); router.push(`/chat/${selectedOrder?.specialist.id}`); }} 
                    buttonStyle={{ backgroundColor: theme.colors.primary, borderRadius: 16, height: 50 }} 
                  />
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    card: { 
        borderRadius: 20, padding: 16, marginBottom: 15, 
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateText: { fontSize: 16, fontWeight: '600' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 12, fontWeight: '700' },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 12 },
    profileRow: { flexDirection: 'row', alignItems: 'center' },
    specName: { fontSize: 16, fontWeight: '700' },
    subText: { fontSize: 12, color: 'gray', marginTop: 2 },
    
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: 'gray', marginTop: 15, fontSize: 16, fontWeight: '500' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    detailBox: { padding: 20, borderRadius: 20, marginBottom: 25 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    infoLabel: { color: 'gray', fontSize: 14, fontWeight: '600' },
    infoValue: { fontSize: 16, fontWeight: '700' },
});
