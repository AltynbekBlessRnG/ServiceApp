import { Icon, Text, useTheme } from '@rneui/themed';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    // Грузим уведомления
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
    if (data) {
        setItems(data);
        // Сразу помечаем их прочитанными (чтобы красная точка исчезала)
        const unreadIds = data.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length > 0) {
            await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        }
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications])
  );

  // Хелпер для иконок (чтобы было красиво)
  const getIconInfo = (title: string) => {
      const t = title?.toLowerCase() || '';
      
      if (t.includes('сообщение') || t.includes('message')) 
          return { name: 'message-circle', color: '#00D2D3', bg: 'rgba(0, 210, 211, 0.15)' }; // Циан
      
      if (t.includes('подтвержд') || t.includes('принят')) 
          return { name: 'check-circle', color: '#2ED573', bg: 'rgba(46, 213, 115, 0.15)' }; // Зеленый
      
      if (t.includes('отмен') || t.includes('нет мест') || t.includes('отклон')) 
          return { name: 'x-circle', color: '#FF4757', bg: 'rgba(255, 71, 87, 0.15)' }; // Красный
      
      if (t.includes('акция') || t.includes('скидка')) 
          return { name: 'gift', color: '#FFA502', bg: 'rgba(255, 165, 2, 0.15)' }; // Оранжевый

      return { name: 'bell', color: '#A09BAF', bg: '#2D2638' }; // Дефолт (Серый)
  };

  const renderItem = ({ item }: { item: any }) => {
      const style = getIconInfo(item.title);
      
      return (
        <View style={[styles.item, { backgroundColor: '#1E2329', borderColor: '#2B3139' }]}>
            {/* Иконка */}
            <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                <Icon name={style.name} type="feather" size={22} color={style.color} />
            </View>
            
            {/* Текст */}
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.date}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                
                <Text style={styles.body}>{item.body}</Text>
                
                {/* Если было непрочитано, можно добавить маркер, но мы уже пометили как read */}
                {/* {!item.is_read && <View style={styles.dot} />} */}
            </View>
        </View>
      );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      
      {/* Кастомная шапка с кнопкой назад */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
             <Icon name="arrow-left" type="feather" color="#fff" size={24} />
          </TouchableOpacity>
          <Text h4 style={styles.headerTitle}>Уведомления</Text>
          <View style={{ width: 40 }} /> 
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#F0B90B" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
            data={items}
            keyExtractor={item => item.id}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={() => { setRefreshing(true); fetchNotifications(); }} 
                    tintColor="#F0B90B" 
                />
            }
            ListEmptyComponent={
                <View style={styles.empty}>
                    <View style={styles.emptyIconCircle}>
                        <Icon name="bell-off" type="feather" size={40} color="#6B6675" />
                    </View>
                    <Text style={styles.emptyTitle}>Тишина...</Text>
                    <Text style={styles.emptyText}>Здесь появятся новости о ваших записях</Text>
                </View>
            }
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    
    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E2329', borderRadius: 12, borderWidth: 1, borderColor: '#2B3139' },
    headerTitle: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },

    // Item
    item: { 
        flexDirection: 'row', 
        padding: 16, 
        borderRadius: 20, 
        marginBottom: 12, 
        borderWidth: 1,
        alignItems: 'center'
    },
    iconBox: { 
        width: 48, height: 48, 
        borderRadius: 16, 
        justifyContent: 'center', alignItems: 'center', 
        marginRight: 15 
    },
    title: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4, flex: 1 },
    body: { fontSize: 13, color: '#A09BAF', lineHeight: 18 },
    date: { fontSize: 11, color: '#6B6675', fontWeight: '600', marginLeft: 10 },
    
    // Empty State
    empty: { alignItems: 'center', marginTop: 100 },
    emptyIconCircle: { 
        width: 80, height: 80, 
        borderRadius: 40, 
        backgroundColor: '#1E2329', 
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1, borderColor: '#2B3139'
    },
    emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    emptyText: { color: '#6B6675', fontSize: 14 }
});
