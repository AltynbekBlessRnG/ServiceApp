import { ButtonGroup, Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar'; // <--- Наш компонент
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function SpecialistMessagesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [chats, setChats] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc('get_my_chats');
    if (data) setChats(data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('service_categories').select('id, name, icon').eq('provider_type', 'specialist').eq('is_active', true).order('sort_order');
    if (data) setCategories(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedIndex === 0) void fetchChats();
      else void fetchCategories();
    }, [fetchCategories, fetchChats, selectedIndex])
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedIndex === 0) fetchChats();
    else fetchCategories();
  };

  // Рендер личного чата
  const renderPersonalChat = ({ item }: { item: any }) => (
    <TouchableOpacity 
        onPress={() => router.push(`/chat/${item.partner_id}`)}
        activeOpacity={0.7}
        style={[styles.chatItem, { backgroundColor: theme.colors.grey0 }]}
    >
        <UserAvatar avatarUrl={item.avatar_url} size={55} />
        
        <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
                <Text style={[styles.name, { color: theme.colors.black }]} numberOfLines={1}>
                    {item.full_name || 'Пользователь'}
                </Text>
                <Text style={styles.time}>
                    {new Date(item.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <Text style={[styles.lastMsg, { color: theme.colors.grey2 }]} numberOfLines={1}>
                {item.last_message}
            </Text>
        </View>
    </TouchableOpacity>
  );

  // Рендер категории
  const renderCategoryChat = ({ item }: { item: any }) => (
    <TouchableOpacity 
        onPress={() => router.push({ pathname: '/chat/category/[id]', params: { id: item.id, name: item.name } })}
        activeOpacity={0.7}
        style={[styles.chatItem, { backgroundColor: theme.colors.grey0 }]}
    >
         <View style={[styles.catIcon, { backgroundColor: theme.colors.primary + '15' }]}>
            <Icon name={item.icon || 'hash'} type="feather" color={theme.colors.primary} size={24} />
         </View>
         
         <View style={styles.chatContent}>
            <Text style={[styles.name, { color: theme.colors.black }]}>{item.name}</Text>
            <Text style={[styles.lastMsg, { color: theme.colors.grey2 }]}>Общий чат специалистов</Text>
         </View>
         <Icon name="chevron-right" type="feather" size={20} color={theme.colors.grey3} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
          <Text h3 style={{ color: theme.colors.black, fontWeight: '800' }}>Сообщения</Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
        <ButtonGroup
            buttons={['Личные', 'Общие чаты']}
            selectedIndex={selectedIndex}
            onPress={setSelectedIndex}
            containerStyle={[styles.selectorContainer, { backgroundColor: theme.colors.grey1, borderColor: theme.colors.grey1 }]}
            textStyle={{ color: theme.colors.grey3, fontWeight: '600' }}
            selectedButtonStyle={{ backgroundColor: theme.colors.background }} // Белая плашка на сером фоне (iOS style)
            selectedTextStyle={{ color: theme.colors.black, fontWeight: 'bold' }}
            innerBorderStyle={{ width: 0 }} // Убираем разделители
        />
      </View>

      {loading && !refreshing ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
          <FlatList
              keyExtractor={(item) => selectedIndex === 0 ? `chat-${item.partner_id}` : `cat-${item.id}`}
              data={selectedIndex === 0 ? chats : categories}
              renderItem={selectedIndex === 0 ? renderPersonalChat : renderCategoryChat}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 10 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                    <Icon name="message-square" type="feather" size={50} color={theme.colors.grey2} />
                    <Text style={[styles.emptyText, { color: theme.colors.grey2 }]}>Диалогов пока нет</Text>
                </View>
              }
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, marginBottom: 15 },
    selectorContainer: { height: 45, borderRadius: 12, marginHorizontal: 0, marginVertical: 0 },
    
    chatItem: { 
        flexDirection: 'row', alignItems: 'center', 
        padding: 15, borderRadius: 20,
        // Тень только легкая
        shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
    },
    chatContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    
    name: { fontSize: 16, fontWeight: '700' },
    time: { fontSize: 11, color: 'gray', fontWeight: '500' },
    lastMsg: { fontSize: 14 },
    
    catIcon: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 15 }
});
