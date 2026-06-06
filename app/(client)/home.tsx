import { Icon, Text, useTheme } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 60) / 3;

const CATEGORY_ORDER = [
  'Барберы',
  'Маникюр',
  'Макияж',
  'Массаж',
  'Репетиторы',
  'Фотографы',
  'IT и диджитал',
  'Автоуслуги',
  'Дизайн и реклама',
  'Ивенты и праздники',
  'Клининг и дом',
  'Медицина',
  'Ремонт и стройка',
  'Салоны красоты',
  'Фото и видео',
  'Юридические услуги',
  'Трансфер',
  'Детские услуги',
  'Развлечения и аренда',
  'Барбершопы',
  'Кофейни',
  'Фотостудии',
  'Зоны отдыха',
  'Пансионаты',
  'Гостевые дома',
  'Коттеджи',
];

const isReadableCategoryName = (name: string) => {
  if (!name) return false;
  return !(name.includes('Ð') || name.includes('Ñ') || name.includes('?'));
};

const getCategoryStyle = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('it') || n.includes('диджитал')) return { icon: 'monitor', color: '#00D2D3' };
  if (n.includes('авто') || n.includes('машин')) return { icon: 'tool', color: '#FF4757' };
  if (n.includes('барбер') || n.includes('стриж')) return { icon: 'scissors', color: '#2ED573' };
  if (n.includes('маникюр')) return { icon: 'edit-3', color: '#E056FD' };
  if (n.includes('макияж')) return { icon: 'smile', color: '#FF6B81' };
  if (n.includes('массаж')) return { icon: 'heart', color: '#00D2D3' };
  if (n.includes('дизайн') || n.includes('реклам')) return { icon: 'pen-tool', color: '#FFA502' };
  if (n.includes('ивент') || n.includes('праздник')) return { icon: 'gift', color: '#FF6B81' };
  if (n.includes('клининг') || n.includes('уборк') || n === 'клининг и дом') return { icon: 'home', color: '#7BED9F' };
  if (n.includes('мед')) return { icon: 'activity', color: '#FF6348' };
  if (n.includes('репетитор')) return { icon: 'book-open', color: '#1E90FF' };
  if (n.includes('ремонт') || n.includes('строй')) return { icon: 'layers', color: '#A55EEA' };
  if (n.includes('салон') || n.includes('красот')) return { icon: 'smile', color: '#E056FD' };
  if (n.includes('фото') || n.includes('видео') || n.includes('фотограф')) return { icon: 'camera', color: '#3742FA' };
  if (n.includes('юрид')) return { icon: 'briefcase', color: '#5352ED' };
  if (n.includes('трансфер')) return { icon: 'navigation', color: '#00D2D3' };
  if (n.includes('дет')) return { icon: 'users', color: '#FF6B81' };
  if (n.includes('развлеч')) return { icon: 'sun', color: '#FFA502' };
  if (n.includes('зоны отдыха') || n.includes('пансион')) return { icon: 'umbrella', color: '#00D2D3' };
  if (n.includes('гостевые дома') || n.includes('коттеджи')) return { icon: 'home', color: '#7BED9F' };
  if (n.includes('кофейн')) return { icon: 'coffee', color: '#FFA502' };
  return { icon: 'grid', color: '#00FFCC' };
};

export default function ClientHome() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<any[]>([]);
  const [mode, setMode] = useState<'specialist' | 'venue'>('specialist');

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').eq('type', mode);
    if (!data) return;

    const cleanCategories = data
      .filter((category) => isReadableCategoryName(category.name))
      .sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.name);
        const bIndex = CATEGORY_ORDER.indexOf(b.name);
        if (aIndex !== -1 || bIndex !== -1) {
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        }
        return a.name.localeCompare(b.name, 'ru');
      });

    setCategories(cleanCategories);
  }, [mode]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.welcomeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Добро пожаловать!</Text>
          <Text h4 style={styles.name}>
            {user?.user_metadata?.full_name?.split(' ')[0] || 'Гость'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(client)/favorites')}>
            <Icon name="heart" type="feather" color="#fff" size={22} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
            <Icon name="bell" type="feather" color="#fff" size={22} />
            <View style={styles.redDot} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push('/(client)/alakol' as any)} activeOpacity={0.9} style={{ marginBottom: 18 }}>
        <LinearGradient colors={['#0EA5E9', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.alakolBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.alakolTitle}>АЛАКОЛЬ 2026</Text>
            <Text style={styles.alakolSub}>Акши, Коктума, Ушарал. Где жить и услуги рядом.</Text>
          </View>
          <Icon name="map-pin" type="feather" color="#fff" size={30} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(client)/ai-search')} activeOpacity={0.9} style={{ marginBottom: 25 }}>
        <LinearGradient colors={['#8A2BE2', '#00FFCC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiBanner}>
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>AI ПОИСК</Text>
            <Text style={styles.aiSub}>Найдите любую услугу мгновенно</Text>
          </View>
          <Icon name="zap" type="feather" color="#fff" size={32} />
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.modeToggle}>
        {(['specialist', 'venue'] as const).map((m) => (
          <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
            <Text style={[styles.modeText, { color: mode === m ? '#00FFCC' : '#6B6675' }]}>
              {m === 'specialist' ? 'МАСТЕРА' : 'ЗАВЕДЕНИЯ'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        ListHeaderComponent={ListHeader}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const style = getCategoryStyle(item.name);
          return (
            <TouchableOpacity
              style={styles.catItem}
              onPress={() => router.push({ pathname: '/(client)/category-results', params: { id: item.id, name: item.name, type: mode } } as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.catIconBox, { borderColor: style.color + '40', shadowColor: style.color }]}>
                <Icon name={style.icon} type="feather" size={32} color={style.color} />
              </View>
              <Text style={styles.catLabel} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingBottom: 10 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  greeting: { color: '#A09BAF', fontSize: 14, fontWeight: '500' },
  name: { color: '#FFF', fontWeight: '900' },
  headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A1625', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2D2638' },
  redDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0055' },
  alakolBanner: { padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
  alakolTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  alakolSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  aiBanner: { padding: 24, borderRadius: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  aiContent: { flex: 1 },
  aiTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1, fontStyle: 'italic' },
  aiSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  modeToggle: { flexDirection: 'row', backgroundColor: '#1A1625', borderRadius: 16, padding: 4, marginBottom: 25, borderWidth: 1, borderColor: '#2D2638' },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  modeBtnActive: { backgroundColor: '#2D2638' },
  modeText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  columnWrapper: { gap: 15 },
  catItem: { width: COLUMN_WIDTH, marginBottom: 20, alignItems: 'center' },
  catIconBox: { width: '100%', aspectRatio: 1, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1625', borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  catLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 10, color: '#E2E8F0' },
});
