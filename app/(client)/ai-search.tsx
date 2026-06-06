
import { Icon, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileCard } from '../../components/ProfileCard';
import { analyzeSearchIntent, SearchIntent } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';

export default function GlobalSearchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  async function handleSearch() {
    if (query.trim().length < 2) return;
    
    setLoading(true);
    setAiStatus('Gemini анализирует запрос...');
    Keyboard.dismiss();

    try {
      // 1. Используем ИИ для понимания намерения
      const intent: SearchIntent = await analyzeSearchIntent(query);
      console.log('AI Intent:', intent);

      setAiStatus(`Ищу: ${intent.category || 'все'} в г. ${intent.city || 'любом'}...`);

      // 2. Строим запрос к Supabase на основе выводов ИИ
      let dbQuery = supabase.from('global_search_view').select('*');

      if (intent.category) {
        dbQuery = dbQuery.ilike('category_name', `%${intent.category}%`);
      }
      
      if (intent.city) {
        dbQuery = dbQuery.ilike('city', `%${intent.city}%`);
      }

      if (intent.intent === 'search_specialist') {
        dbQuery = dbQuery.eq('role', 'specialist');
      } else if (intent.intent === 'search_venue') {
        dbQuery = dbQuery.eq('role', 'venue');
      }

      // Дополнительный поиск по тегам, если ничего не нашлось по жестким фильтрам
      const { data } = await dbQuery.limit(20);
      
      if (data && data.length > 0) {
        setResults(data);
      } else {
        // Fallback: обычный текстовый поиск по описанию
        const { data: fallbackData } = await supabase
          .from('global_search_view')
          .select('*')
          .or(`full_name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20);
        setResults(fallbackData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setAiStatus(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Icon name="arrow-left" type="feather" color={theme.colors.black} />
            </TouchableOpacity>
            
            <View style={[styles.searchWrapper, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.primary }]}>
                <Icon name="sparkles" type="ionicon" size={18} color={theme.colors.primary} />
                <TextInput 
                    autoFocus 
                    style={[styles.input, { color: theme.colors.black }]} 
                    placeholder="Напр: Маникюр в Астане до 5000" 
                    placeholderTextColor={theme.colors.grey3}
                    value={query} 
                    onChangeText={setQuery}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                />
                {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
            </View>
        </View>

        {aiStatus && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiStatusText}>{aiStatus}</Text>
          </View>
        )}

        <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <ProfileCard item={item} type={item.role === 'venue' ? 'venue' : 'specialist'} />
            )}
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            ListEmptyComponent={
                !loading ? (
                <View style={styles.empty}>
                    <Icon name="search-outline" type="ionicon" size={60} color={theme.colors.grey1} />
                    <Text style={[styles.emptyText, { color: theme.colors.grey2 }]}>
                        {query.length > 0 ? 'Ничего не найдено. Попробуйте уточнить запрос.' : 'Используйте силу ИИ, чтобы найти идеальный сервис'}
                    </Text>
                </View>
                ) : null
            }
        />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 10 },
  backBtn: { padding: 5 },
  searchWrapper: { 
      flex: 1, flexDirection: 'row', alignItems: 'center', 
      paddingHorizontal: 15, borderRadius: 16, height: 55,
      borderWidth: 1.5
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, height: '100%' },
  aiBadge: { 
    marginHorizontal: 20, padding: 8, 
    backgroundColor: '#6366F115', borderRadius: 10,
    alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#6366F1'
  },
  aiStatusText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { marginTop: 15, fontSize: 15, textAlign: 'center', lineHeight: 22 }
});
