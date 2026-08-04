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
  const { isAdmin } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));

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
      .select('*, provider_verifications(status, submitted_at, review_note)')
      .order('created_at', { ascending: false });

    if (error) Alert.alert('Ошибка', error.message);
    else setUsers(data || []);
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('id, target_type, target_id, reason, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true });
    if (reportError) Alert.alert('Ошибка модерации', reportError.message);
    else setReports(reportData || []);
    setLoading(false);
    setRefreshing(false);
  }

  async function toggleBan(userId: string, currentStatus: boolean) {
    const { error } = await supabase.rpc('admin_set_user_banned', { p_user_id: userId, p_banned: !currentStatus });
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
  }

  async function moderateReport(reportId: string, action: 'hide' | 'dismiss') {
    const { error } = await supabase.rpc('moderate_report', {
      p_report_id: reportId,
      p_action: action,
      p_note: action === 'hide' ? 'Скрыто администратором' : 'Жалоба отклонена администратором',
    });
    if (error) Alert.alert('Ошибка модерации', error.message);
    else setReports((current) => current.filter((report) => report.id !== reportId));
  }

  async function reviewProvider(providerId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase.rpc('admin_review_provider', {
      p_provider_id: providerId,
      p_status: status,
      p_note: status === 'approved' ? 'Профиль подтверждён' : 'Профиль требует исправлений',
    });
    if (error) {
      Alert.alert('Ошибка проверки', error.message);
      return;
    }
    await fetchUsers();
  }

  const pendingProviders = users.filter((user) => user.provider_verifications?.status === 'pending');

  const moderationQueue = (
    <View style={styles.moderationSection}>
      <Text style={styles.moderationTitle}>Проверка исполнителей ({pendingProviders.length})</Text>
      {pendingProviders.length === 0 ? (
        <Text style={styles.emptyQueue}>Новых анкет нет</Text>
      ) : pendingProviders.map((provider) => (
        <View key={provider.id} style={styles.reportCard}>
          <Text style={styles.reportType}>{provider.role === 'venue' ? 'Заведение' : 'Специалист'} · {provider.city || 'город не указан'}</Text>
          <Text style={styles.providerName}>{provider.full_name || 'Без имени'}</Text>
          <View style={styles.reportActions}>
            <TouchableOpacity style={[styles.reportButton, styles.hideButton]} onPress={() => reviewProvider(provider.id, 'rejected')}>
              <Text style={styles.reportButtonText}>На доработку</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reportButton, styles.approveButton]} onPress={() => reviewProvider(provider.id, 'approved')}>
              <Text style={styles.reportButtonText}>Одобрить</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={styles.moderationTitle}>Модерация ({reports.length})</Text>
      {reports.length === 0 ? (
        <Text style={styles.emptyQueue}>Открытых жалоб нет</Text>
      ) : reports.map((report) => (
        <View key={report.id} style={styles.reportCard}>
          <Text style={styles.reportType}>{report.target_type} · {String(report.target_id).slice(0, 8)}</Text>
          <Text style={styles.reportReason}>{report.reason}</Text>
          <View style={styles.reportActions}>
            <TouchableOpacity style={[styles.reportButton, styles.dismissButton]} onPress={() => moderateReport(report.id, 'dismiss')}>
              <Text style={styles.reportButtonText}>Отклонить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reportButton, styles.hideButton]} onPress={() => moderateReport(report.id, 'hide')}>
              <Text style={styles.reportButtonText}>Скрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={styles.usersTitle}>Пользователи</Text>
    </View>
  );

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
        {item.provider_verifications?.status && (
          <Text style={{ color: item.provider_verifications.status === 'approved' ? '#10B981' : item.provider_verifications.status === 'rejected' ? '#F6465D' : '#F0B90B', fontSize: 10, fontWeight: '800', marginTop: 3 }}>
            {item.provider_verifications.status === 'approved' ? 'ПРОВЕРЕН' : item.provider_verifications.status === 'rejected' ? 'НА ДОРАБОТКЕ' : 'ОЖИДАЕТ ПРОВЕРКИ'}
          </Text>
        )}
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
          ListHeaderComponent={moderationQueue}
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
  banBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  moderationSection: { marginBottom: 18 },
  moderationTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  emptyQueue: { color: '#848E9C', paddingVertical: 12 },
  reportCard: { backgroundColor: '#1E2329', borderColor: '#2B3139', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  reportType: { color: '#F0B90B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  reportReason: { color: '#FAFAFA', fontSize: 14, marginTop: 7 },
  providerName: { color: '#FAFAFA', fontSize: 16, fontWeight: '800', marginTop: 7 },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reportButton: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 9 },
  dismissButton: { backgroundColor: '#2B3139' },
  hideButton: { backgroundColor: '#F6465D' },
  approveButton: { backgroundColor: '#10B981' },
  reportButtonText: { color: '#FAFAFA', fontWeight: '700' },
  usersTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '800', marginTop: 16 },
});
