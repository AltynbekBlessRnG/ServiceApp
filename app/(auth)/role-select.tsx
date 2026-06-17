import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveHomeRoute } from '../../lib/auth-routing';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function RoleSelectScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { city } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);

  async function handleSelectRole(role: 'client' | 'specialist' | 'venue') {
    if (!user) return;
    setLoading(true);

    try {
      const userCity = typeof city === 'string' ? city : user.user_metadata?.city || null;
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          city: userCity,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (role === 'specialist') {
        await supabase.from('specialist_profiles').upsert({ id: user.id });
      } else if (role === 'venue') {
        await supabase.from('venue_profiles').upsert({ id: user.id });
      }

      await supabase.auth.updateUser({ data: { role, city: userCity } });
      router.replace(resolveHomeRoute(role) as never);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
      setLoading(false);
    }
  }

  const RoleCard = ({ role, title, desc, icon, color }: any) => (
    <TouchableOpacity
      style={[styles.card, { borderColor: `${color}40`, shadowColor: color }]}
      activeOpacity={0.8}
      onPress={() => handleSelectRole(role)}
      disabled={loading}
    >
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} type="feather" size={32} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: '#fff' }]}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      <Icon name="chevron-right" type="feather" color="#6B6675" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text h2 style={{ color: '#fff', fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>
          Кто вы?
        </Text>
        <Text style={{ color: '#848E9C', textAlign: 'center', fontSize: 16 }}>
          Выберите режим использования
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#F0B90B" />
          <Text style={{ color: '#fff', marginTop: 20, fontWeight: '600' }}>Настройка аккаунта...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <RoleCard
            role="client"
            title="Я клиент"
            desc="Ищу услуги, мастеров и удобное время для записи."
            icon="search"
            color="#F0B90B"
          />

          <RoleCard
            role="specialist"
            title="Я специалист"
            desc="Веду профиль, расписание, портфолио и принимаю записи."
            icon="briefcase"
            color="#FAFAFA"
          />

          <RoleCard
            role="venue"
            title="Я заведение"
            desc="Управление объектами, бронированиями и гостями."
            icon="map-pin"
            color="#848E9C"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginBottom: 40 },
  content: { gap: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2329',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B3139',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  cardDesc: { color: '#848E9C', fontSize: 13, lineHeight: 18 },
});
