import { Icon, Text, useTheme } from '@rneui/themed';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const PADDING = 20;

type ProviderType = 'specialist' | 'venue';
type ServiceItem = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
};
type CategoryDetails = {
  slug: string;
  name: string;
  icon: string;
  services: ServiceItem[];
};

export default function SubcategoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { categoryKey = '', type = 'specialist' } = useLocalSearchParams<{
    categoryKey: string;
    type: ProviderType;
  }>();
  const providerType: ProviderType = type === 'venue' ? 'venue' : 'specialist';

  const { data: category, isLoading, isError, refetch } = useQuery({
    queryKey: ['service-category', providerType, categoryKey],
    enabled: Boolean(categoryKey),
    queryFn: async (): Promise<CategoryDetails> => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('slug, name, icon, services(id, slug, name, icon, sort_order)')
        .eq('provider_type', providerType)
        .eq('slug', categoryKey)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      const raw = data as unknown as CategoryDetails;
      return {
        slug: raw.slug,
        name: raw.name,
        icon: raw.icon,
        services: (raw.services || []).sort(
          (a: ServiceItem, b: ServiceItem) => a.sort_order - b.sort_order,
        ),
      };
    },
  });

  const openService = (service: ServiceItem) => {
    router.push({
      pathname: '/(client)/category-results',
      params: {
        categorySlug: categoryKey,
        serviceSlug: service.slug,
        name: service.name,
        type: providerType,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" type="feather" color="#FAFAFA" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{category?.name || 'Услуги'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#F0B90B" size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={category?.services || []}
          keyExtractor={(item) => item.slug}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ padding: PADDING, paddingBottom: 100, flexGrow: 1 }}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => openService(item)}>
              <View style={styles.cardIconBox}>
                <Icon name={item.icon || 'map-pin'} type="feather" size={26} color="#F0B90B" />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <TouchableOpacity style={styles.emptyState} onPress={() => refetch()}>
              <Icon name={isError ? 'alert-circle' : 'inbox'} type="feather" size={42} color="#848E9C" />
              <Text style={styles.emptyText}>
                {isError ? 'Не удалось загрузить услуги. Нажмите, чтобы повторить.' : 'В этой категории пока нет услуг'}
              </Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E2329',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  columnWrapper: { gap: 10 },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#1E2329',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2B3139',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(240, 185, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { color: '#FAFAFA', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  emptyState: { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#848E9C', textAlign: 'center', marginTop: 12, lineHeight: 20 },
});
