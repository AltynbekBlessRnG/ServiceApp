import { Avatar, Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';

export default function CategoryChatScreen() {
  const { theme } = useTheme();
  const { id, name } = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();

    // ПОДПИСКА НА REAL-TIME
    const channel = supabase.channel(`category_${id}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'category_messages',
          filter: `category_id=eq.${id}`
      }, async (payload) => {
          // Когда пришло сообщение, нам нужно подтянуть имя автора
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();
          
          const msgWithProfile = { ...payload.new, profiles: profile };
          setMessages(prev => [msgWithProfile, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('category_messages')
      .select('*, profiles(full_name, avatar_url)')
      .eq('category_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setMessages(data);
    setLoading(false);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('category_messages').insert({
        category_id: id,
        sender_id: user.id,
        content
    });

    if (error) console.error(error);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}><Icon name="arrow-left" type="feather" color={theme.colors.black} /></TouchableOpacity>
        <View style={{ marginLeft: 15 }}>
            <Text style={[styles.title, { color: theme.colors.black }]}>{name}</Text>
            <Text style={styles.subTitle}>Общий чат категории</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {loading ? <ActivityIndicator style={{ flex: 1 }} /> : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            return (
              <View style={[styles.msgRow, isMine && { justifyContent: 'flex-end' }]}>
                {!isMine && <Avatar rounded size={35} source={item.profiles?.avatar_url ? { uri: item.profiles.avatar_url } : undefined} containerStyle={{ marginRight: 8 }} />}
                <View style={[styles.bubble, { backgroundColor: isMine ? '#6366f1' : theme.colors.grey0 }]}>
                  {!isMine && <Text style={styles.authorName}>{item.profiles?.full_name}</Text>}
                  <Text style={{ color: isMine ? '#fff' : theme.colors.black }}>{item.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.colors.grey0, color: theme.colors.black }]} 
            value={newMessage} 
            onChangeText={setNewMessage}
            placeholder="Написать всем..."
            placeholderTextColor="gray"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!newMessage.trim()}>
            <Icon name="send" type="feather" color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  title: { fontSize: 18, fontWeight: '900' },
  subTitle: { fontSize: 12, color: '#2ed573', fontWeight: '700' },
  msgRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  authorName: { fontSize: 10, fontWeight: 'bold', color: '#6366f1', marginBottom: 4 },
  inputArea: { flexDirection: 'row', padding: 15, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#ddd' },
  input: { flex: 1, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});
