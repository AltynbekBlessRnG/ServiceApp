import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader'; // <---
import { UserAvatar } from '../../components/UserAvatar'; // <---
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.is_admin === true;
  if (!isAdmin) {
      return (
        <View style={styles.center}>
            <Text h4>Доступ запрещен</Text>
            <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 20 }}>
                <Text style={{ color: 'blue' }}>На главную</Text>
            </TouchableOpacity>
        </View>
      )
  }

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) Alert.alert('Ошибка', error.message);
    else setUsers(data || []);
    setLoading(false);
    setRefreshing(false);
  }

  async function toggleBan(userId: string, currentStatus: boolean) {
    const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
  }

  const renderUser = ({ item }: { item: any }) => (
    <View style={[styles.userCard, { backgroundColor: theme.colors.grey0, opacity: item.is_banned ? 0.6 : 1 }]}>
      <UserAvatar avatarUrl={item.avatar_url} size={50} />
      
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: theme.colors.black, fontSize: 16 }}>{item.full_name || 'Без имени'}</Text>
            {item.is_banned && <Text style={{ color: 'red', fontSize: 10, marginLeft: 5, fontWeight: 'bold' }}>BANNED</Text>}
        </View>
        <Text style={{ color: theme.colors.grey2, fontSize: 12 }}>
          {item.role === 'client' ? 'Клиент' : item.role === 'specialist' ? 'Специалист' : item.role === 'venue' ? 'Заведение' : 'Не выбран'} • {item.city || 'Город скрыт'}
        </Text>
        <Text style={{ color: theme.colors.grey3, fontSize: 10 }}>ID: {item.id.slice(0, 8)}...</Text>
      </View>
      
      <TouchableOpacity 
        onPress={() => toggleBan(item.id, item.is_banned)}
        style={[styles.banBtn, { backgroundColor: item.is_banned ? '#10B981' : '#EF4444' }]}
      >
        <Icon name={item.is_banned ? "check" : "slash"} type="feather" color="white" size={16} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Панель управления" />

      <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.grey0 }]}>
              <Text style={styles.statLabel}>Пользователей</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{users.length}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.grey0 }]}>
              <Text style={styles.statLabel}>Заблокировано</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{users.filter(u => u.is_banned).length}</Text>
          </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={theme.colors.primary} />}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 15 },
  statBox: { flex: 1, padding: 15, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  statLabel: { fontSize: 12, color: 'gray', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: '900', marginTop: 5 },
  
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 10 },
  banBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});