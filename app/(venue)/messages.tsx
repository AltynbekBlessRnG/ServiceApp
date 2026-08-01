import { Avatar, ButtonGroup, Icon, ListItem, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function MessagesListScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // 0 = Личные, 1 = Общие
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
    const { data } = await supabase.from('service_categories').select('id, name, icon').eq('provider_type', 'venue').eq('is_active', true).order('sort_order');
    if (data) setCategories(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
      if(selectedIndex === 0) void fetchChats();
      else void fetchCategories();
  }, [fetchCategories, fetchChats, selectedIndex]));

  const onRefresh = () => { 
      setRefreshing(true); 
      if (selectedIndex === 0) fetchChats(); else fetchCategories(); 
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
          <Text h4 style={{color: theme.colors.black}}>Сообщения</Text>
      </View>

      <ButtonGroup
        buttons={['Личные', 'Общие чаты']}
        selectedIndex={selectedIndex}
        onPress={setSelectedIndex}
        containerStyle={{marginBottom: 10, borderRadius: 10, backgroundColor: theme.colors.grey0}}
        textStyle={{color: theme.colors.black}}
        selectedButtonStyle={{backgroundColor: theme.colors.primary}}
      />

      {loading && !refreshing ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : selectedIndex === 0 ? (
          // --- ЛИЧНЫЕ ЧАТЫ ---
          <FlatList
              data={chats}
              keyExtractor={(item) => item.partner_id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={<Text style={styles.emptyText}>Нет диалогов</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => router.push(`/chat/${item.partner_id}`)}>
                    <ListItem containerStyle={{backgroundColor: theme.colors.background}}>
                        <Avatar rounded size={50} source={item.avatar_url ? { uri: item.avatar_url } : undefined} containerStyle={{ backgroundColor: '#ccc' }} />
                        <ListItem.Content>
                            <ListItem.Title style={{fontWeight: 'bold', color: theme.colors.black}}>{item.full_name}</ListItem.Title>
                            <ListItem.Subtitle style={{color: 'gray'}} numberOfLines={1}>{item.last_message}</ListItem.Subtitle>
                        </ListItem.Content>
                        <ListItem.Chevron />
                    </ListItem>
                </TouchableOpacity>
              )}
          />
      ) : (
          // --- ОБЩИЕ ЧАТЫ (КАТЕГОРИИ) ---
          <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => router.push({ pathname: '/chat/category/[id]', params: { id: item.id, name: item.name } })}>
                    <ListItem containerStyle={{backgroundColor: theme.colors.background}} bottomDivider>
                         <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                           <Icon name={item.icon || 'hash'} type="feather" size={24} color={theme.colors.primary} />
                         </View>
                        <ListItem.Content>
                            <ListItem.Title style={{fontWeight: 'bold', color: theme.colors.black}}>{item.name}</ListItem.Title>
                            <ListItem.Subtitle style={{color: 'gray'}}>Поиск и общение</ListItem.Subtitle>
                        </ListItem.Content>
                        <Icon name="users" type="feather" size={20} color="gray" />
                    </ListItem>
                </TouchableOpacity>
              )}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ 
    container: { flex: 1, paddingTop: 40, paddingHorizontal: 10 }, 
    header: { marginBottom: 10, paddingLeft: 10 },
    emptyText: { textAlign: 'center', marginTop: 50, color: 'gray' }
});
