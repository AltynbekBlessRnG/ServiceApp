import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar'; // <---
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function PersonalChatScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams();
  const receiverId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiver, setReceiver] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !receiverId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const [{ data: profile }, { data: directId, error: conversationError }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').eq('id', receiverId).single(),
        supabase.rpc('get_or_create_direct_conversation', { p_partner_id: receiverId }),
      ]);
      if (!active) return;
      if (profile) setReceiver(profile);
      if (conversationError || !directId) {
        setLoading(false);
        return;
      }
      setConversationId(directId);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', directId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!active) return;
      setMessages(data || []);
      await supabase.rpc('mark_conversation_read', { p_conversation_id: directId });
      setLoading(false);
      channel = supabase
        .channel(`conversation:${directId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${directId}`,
        }, (payload) => {
          const message = payload.new;
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [message, ...current],
          );
          void supabase.rpc('mark_conversation_read', { p_conversation_id: directId });
        })
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [receiverId, user]);

  async function sendMessage() {
    if (!newMessage.trim() || !user || !conversationId) return;
    const msgText = newMessage.trim();
    setNewMessage(''); 

    // Оптимистичное обновление UI (сразу добавляем сообщение)
    const optimisticMsg = {
        id: Date.now().toString(),
        content: msgText,
        sender_id: user.id,
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
    };
    setMessages(prev => [optimisticMsg, ...prev]);

    const { error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, conversation_id: conversationId, content: msgText });

    if (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMsg.id));
      setNewMessage(msgText);
    }
  }

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[styles.messageRow, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        <View style={[
            styles.bubble, 
            { backgroundColor: isMine ? theme.colors.primary : theme.colors.grey1 },
            isMine ? styles.myBubble : styles.theirBubble
        ]}>
            <Text style={[styles.msgText, { color: isMine ? '#fff' : theme.colors.black }]}>
                {item.content}
            </Text>
            <Text style={[styles.timeText, { color: isMine ? 'rgba(255,255,255,0.7)' : theme.colors.grey2 }]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.colors.background, borderBottomColor: theme.colors.grey1 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Icon name="chevron-left" type="feather" size={30} color={theme.colors.black} />
            </TouchableOpacity>
            
            <UserAvatar avatarUrl={receiver?.avatar_url} size={40} />
            
            <View style={{ marginLeft: 12 }}>
                <Text style={[styles.headerName, { color: theme.colors.black }]}>{receiver?.full_name || 'Чат'}</Text>
            </View>
        </View>

        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        <FlatList 
            inverted
            data={messages} 
            keyExtractor={(item) => item.id.toString()} 
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        />

        {/* INPUT */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10, backgroundColor: theme.colors.background, borderTopColor: theme.colors.grey1 }]}>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]}>
                    <TextInput 
                        style={[styles.input, { color: theme.colors.black }]} 
                        placeholder="Сообщение..." 
                        placeholderTextColor={theme.colors.grey3}
                        value={newMessage} 
                        onChangeText={setNewMessage} 
                        multiline
                    />
                    <TouchableOpacity 
                        onPress={sendMessage} 
                        disabled={!newMessage.trim()}
                        style={[
                            styles.sendBtn, 
                            { backgroundColor: newMessage.trim() ? theme.colors.primary : theme.colors.grey1 }
                        ]}
                    >
                        <Icon name="arrow-up" type="feather" color={newMessage.trim() ? "#fff" : theme.colors.grey3} size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 15, paddingBottom: 15, 
    borderBottomWidth: 1,
    shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, elevation: 2
  },
  backBtn: { marginRight: 10 },
  headerName: { fontSize: 16, fontWeight: '800' },
  headerStatus: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  
  messageRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: { 
    maxWidth: '78%', 
    paddingHorizontal: 14, paddingVertical: 10, 
    borderRadius: 20,
    minWidth: 80
  },
  // Закругляем углы по-разному для своих и чужих
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  
  msgText: { fontSize: 16, lineHeight: 22 },
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4, opacity: 0.8 },

  inputContainer: { paddingHorizontal: 15, paddingTop: 10, borderTopWidth: 1 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'flex-end', 
    borderRadius: 25, 
    paddingHorizontal: 15, paddingVertical: 8,
    borderWidth: 1
  },
  input: { flex: 1, fontSize: 16, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { 
    width: 36, height: 36, borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8, marginBottom: 2
  }
});
