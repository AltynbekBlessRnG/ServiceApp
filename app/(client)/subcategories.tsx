import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const PADDING = 20;
const CARD_GAP = 12;

const SUBCATEGORY_DATA: Record<string, { icon: string; subs: string[] }> = {
  beauty: {
    icon: 'heart',
    subs: ['Барбершопы', 'Салоны красоты', 'Массаж', 'Маникюр', 'Макияж'],
  },
  auto: {
    icon: 'truck',
    subs: ['Детейлинг', 'СТО', 'Аренда авто', 'Трансфер'],
  },
  events: {
    icon: 'gift',
    subs: ['Ведущие', 'Фотографы', 'Музыканты', 'Тамада', 'Рестораны'],
  },
  leisure: {
    icon: 'sun',
    subs: ['Зоны отдыха', 'Глэмпинги', 'Отели', 'Коттеджи'],
  },
  business: {
    icon: 'trending-up',
    subs: ['SMM', 'Таргетолог', 'Маркетолог', 'Консалтинг'],
  },
  legal: {
    icon: 'briefcase',
    subs: ['Юрист', 'Адвокат', 'Бухгалтер'],
  },
  education: {
    icon: 'book-open',
    subs: ['Репетиторы', 'Курсы', 'Языки'],
  },
  home: {
    icon: 'home',
    subs: ['Клининг', 'Ремонт', 'Дизайн интерьера'],
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  beauty: 'Красота',
  auto: 'Авто',
  events: 'Мероприятия',
  leisure: 'Отдых',
  business: 'Бизнес',
  legal: 'Юристы',
  education: 'Образование',
  home: 'Дом и ремонт',
};

const getSubIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('барбер')) return 'scissors';
  if (n.includes('салон')) return 'smile';
  if (n.includes('массаж')) return 'heart';
  if (n.includes('маникюр')) return 'edit-3';
  if (n.includes('макияж')) return 'feather';
  if (n.includes('детейлинг')) return 'droplet';
  if (n.includes('сто') || n.includes('ремонт')) return 'tool';
  if (n.includes('аренда авто')) return 'car';
  if (n.includes('трансфер')) return 'navigation';
  if (n.includes('ведущ')) return 'mic';
  if (n.includes('фотограф')) return 'camera';
  if (n.includes('музык')) return 'music';
  if (n.includes('тамада')) return 'users';
  if (n.includes('ресторан')) return 'coffee';
  if (n.includes('зона') || n.includes('отдых')) return 'umbrella';
  if (n.includes('глэмпинг')) return 'tent';
  if (n.includes('отел')) return 'home';
  if (n.includes('коттедж')) return 'home';
  if (n.includes('smm')) return 'share-2';
  if (n.includes('таргет')) return 'target';
  if (n.includes('маркетолог')) return 'trending-up';
  if (n.includes('консалтинг')) return 'briefcase';
  if (n.includes('юрист') || n.includes('адвокат')) return 'shield';
  if (n.includes('бухгалтер')) return 'calculator';
  if (n.includes('репетитор') || n.includes('курс') || n.includes('язык')) return 'book-open';
  if (n.includes('клининг')) return 'home';
  if (n.includes('дизайн')) return 'pen-tool';
  return 'chevron-right';
};

export default function SubcategoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { categoryKey, type } = useLocalSearchParams<{ categoryKey: string; type: string }>();
  const [categories, setCategories] = useState<any[]>([]);

  const data = SUBCATEGORY_DATA[categoryKey || ''] || { icon: 'grid', subs: [] };
  const label = CATEGORY_LABELS[categoryKey || ''] || categoryKey;

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').eq('type', type || 'specialist');
    if (data) setCategories(data);
  }, [type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubPress = (subName: string) => {
    const matched = categories.find(
      (c) => c.name.toLowerCase().includes(subName.toLowerCase()) || subName.toLowerCase().includes(c.name.toLowerCase())
    );
    if (matched) {
      router.push({
        pathname: '/(client)/category-results',
        params: { id: matched.id, name: subName, type: type || 'specialist' },
      } as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" type="feather" color="#FAFAFA" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data.subs}
        keyExtractor={(item) => item}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ padding: PADDING, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const iconName = getSubIcon(item);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handleSubPress(item)}
            >
              <View style={styles.cardIconBox}>
                <Icon name={iconName} type="feather" size={24} color="#F0B90B" />
              </View>
              <Text style={styles.cardTitle}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E2329',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '800' },
  columnWrapper: { gap: CARD_GAP },
  card: {
    flex: 1,
    backgroundColor: '#1E2329',
    borderRadius: 12,
    padding: 20,
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderColor: '#2B3139',
    alignItems: 'flex-start',
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(240, 185, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { color: '#FAFAFA', fontSize: 14, fontWeight: '700' },
});
