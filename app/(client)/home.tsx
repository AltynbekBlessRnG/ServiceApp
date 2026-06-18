import { Icon, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - CARD_GAP) / 2;

const MAIN_CATEGORIES = [
  { key: 'beauty', label: 'Красота', icon: 'heart', sub: ['Барбершопы', 'Салоны красоты', 'Массаж', 'Маникюр', 'Макияж'] },
  { key: 'auto', label: 'Авто', icon: 'truck', sub: ['Детейлинг', 'СТО', 'Аренда авто', 'Трансфер'] },
  { key: 'events', label: 'Мероприятия', icon: 'gift', sub: ['Ведущие', 'Фотографы', 'Музыканты', 'Тамада'] },
  { key: 'leisure', label: 'Отдых', icon: 'sun', sub: ['Зоны отдыха', 'Глэмпинги', 'Отели', 'Коттеджи'] },
  { key: 'business', label: 'Бизнес', icon: 'trending-up', sub: ['SMM', 'Таргетолог', 'Маркетолог', 'Консалтинг'] },
  { key: 'legal', label: 'Юристы', icon: 'briefcase', sub: ['Юрист', 'Адвокат', 'Бухгалтер'] },
  { key: 'education', label: 'Образование', icon: 'book-open', sub: ['Репетиторы', 'Курсы', 'Языки'] },
  { key: 'home', label: 'Дом и ремонт', icon: 'home', sub: ['Клининг', 'Ремонт', 'Дизайн интерьера'] },
];

const VENUE_CATEGORIES = [
  { key: 'v_food', label: 'Питание', icon: 'coffee', sub: ['Рестораны', 'Пабы', 'Кофейни', 'Пиццерии', 'Кальянные'] },
  { key: 'v_fun', label: 'Развлечения', icon: 'music', sub: ['Бары', 'Компьютерные клубы', 'Караоке', 'Ночные клубы'] },
  { key: 'v_beauty', label: 'Красота', icon: 'heart', sub: ['Салоны красоты', 'Барбершопы', 'Фотостудии'] },
  { key: 'v_stay', label: 'Жилье', icon: 'home', sub: ['Зоны отдыха', 'Пансионаты', 'Гостевые дома', 'Коттеджи'] },
];

export default function ClientHome() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'specialist' | 'venue'>('specialist');

  const renderMainCategory = ({ item }: { item: typeof MAIN_CATEGORIES[0] }) => (
    <TouchableOpacity
      style={styles.mainCard}
      activeOpacity={0.7}
      onPress={() => {
        router.push({
          pathname: '/(client)/subcategories',
          params: { categoryKey: item.key, type: mode },
        } as any);
      }}
    >
      <View style={styles.mainCardHeader}>
        <View style={styles.mainCardIconBox}>
          <Icon name={item.icon} type="feather" size={26} color="#F0B90B" />
        </View>
        <Icon name="chevron-right" type="feather" size={16} color="#848E9C" />
      </View>
      <Text style={styles.mainCardTitle}>{item.label}</Text>
      <Text style={styles.mainCardSub} numberOfLines={2}>
        {item.sub?.join(' · ')}
      </Text>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.welcomeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Привет,</Text>
          <Text h4 style={styles.name}>
            {user?.user_metadata?.full_name?.split(' ')[0] || 'Гость'} 👋
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(client)/favorites')}>
            <Icon name="heart" type="feather" color="#848E9C" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
            <Icon name="bell" type="feather" color="#848E9C" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(client)/ai-search')}
        activeOpacity={0.8}
        style={styles.searchBox}
      >
        <Icon name="search" type="feather" size={18} color="#848E9C" />
        <Text style={styles.searchPlaceholder}>Найти услугу или специалиста</Text>
        <View style={styles.aiBadge}>
          <Icon name="zap" type="feather" size={12} color="#0B0E11" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(client)/alakol' as any)} activeOpacity={0.9} style={styles.promoBanner}>
        <View style={styles.promoContent}>
          <Text style={styles.promoLabel}>АЛАКОЛЬ 2026</Text>
          <Text style={styles.promoText}>Акши, Коктума, Ушарал</Text>
        </View>
        <Icon name="chevron-right" type="feather" size={18} color="#848E9C" />
      </TouchableOpacity>

      <View style={styles.modeToggle}>
        {(['specialist', 'venue'] as const).map((m) => (
          <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
            <Icon
              name={m === 'specialist' ? 'user' : 'map-pin'}
              type="feather"
              size={14}
              color={mode === m ? '#0B0E11' : '#848E9C'}
            />
            <Text style={[styles.modeText, { color: mode === m ? '#0B0E11' : '#848E9C' }]}>
              {m === 'specialist' ? 'Мастера' : 'Заведения'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{mode === 'venue' ? 'Заведения' : 'Категории'}</Text>
      </View>
    </View>
  );

  const categories = mode === 'venue' ? VENUE_CATEGORIES : MAIN_CATEGORIES;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={categories}
        keyExtractor={(item) => item.key}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: PADDING, paddingBottom: 100 }}
        renderItem={renderMainCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingBottom: 5 },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  greeting: { color: '#848E9C', fontSize: 14, fontWeight: '500' },
  name: { color: '#FAFAFA', fontWeight: '800', fontSize: 22 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E2329',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2329',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  searchPlaceholder: { flex: 1, marginLeft: 10, color: '#848E9C', fontSize: 14, fontWeight: '500' },
  aiBadge: {
    backgroundColor: '#F0B90B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2329',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  promoContent: { flex: 1 },
  promoLabel: { color: '#F0B90B', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  promoText: { color: '#848E9C', fontSize: 13, marginTop: 2, fontWeight: '500' },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E2329',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  modeBtnActive: { backgroundColor: '#F0B90B' },
  modeText: { fontWeight: '700', fontSize: 13 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '800' },
  columnWrapper: { gap: CARD_GAP },
  mainCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1E2329',
    borderRadius: 12,
    padding: 18,
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 185, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCardTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  mainCardSub: { color: '#848E9C', fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
