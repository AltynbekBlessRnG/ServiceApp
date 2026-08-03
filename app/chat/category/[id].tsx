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
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const categoryId = Number(Array.isArray(id) ? id[0] : id);
    if (!Number.isFinite(categoryId)) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('kind', 'category')
        .eq('category_id', categoryId)
        .maybeSingle();
      if (!active || conversationError || !conversation) {
        if (active) setLoading(false);
        return;
      }
      setConversationId(conversation.id);
      const { data } = await supabase
        .from('messages')
        .select('*, profiles!sender_id(full_name, avatar_url)')
        .eq('conversation_id', conversation.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!active) return;
      setMessages(data || []);
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversation.id });
      setLoading(false);

      channel = supabase
        .channel(`category:${conversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        }, async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();
          const message: Record<string, any> = { ...payload.new, profiles: profile };
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [message, ...current],
          );
          void supabase.rpc('mark_conversation_read', { p_conversation_id: conversation.id });
        })
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [id]);

  async function sendMessage() {
    if (!newMessage.trim() || !user || !conversationId || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Realtime is for messages from other devices. Render our message now so a
    // transient socket connection never makes a successful send look lost.
    const optimisticMessage = {
      id: `pending:${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      is_hidden: false,
      profiles: null,
    };
    setMessages((current) => [optimisticMessage, ...current]);

    const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content
    });

    if (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setNewMessage(content);
      console.error('Unable to send category message:', error);
    }
    setSending(false);
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
                <View style={[styles.bubble, { backgroundColor: isMine ? '#F0B90B' : theme.colors.grey0 }]}>
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
          <TouchableOpacity
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            accessibilityLabel="Отправить сообщение"
          >
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
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#F0B90B', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendBtnDisabled: { opacity: 0.45 },
});
