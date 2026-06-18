import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function ClientProfile() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchProfile() {
        if (!user) return;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data && isActive) {
            setProfileData(data);
          }
        } catch (e) {
          // ignore
        } finally {
          if (isActive) setLoading(false);
        }
      }

      fetchProfile();

      return () => {
        isActive = false;
      };
    }, [user])
  );

  const handleLogout = async () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
      }}
    ]);
  };

  const MenuItem = ({ icon, title, onPress, color = '#fff', isDestructive = false }: any) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: isDestructive ? 'rgba(246, 70, 93, 0.1)' : '#1E2329' }]}>
        <Icon name={icon} type="feather" size={20} color={isDestructive ? '#F6465D' : color} />
      </View>
      <Text style={[styles.menuText, isDestructive && { color: '#F6465D' }]}>{title}</Text>
      <Icon name="chevron-right" type="feather" size={20} color="#2B3139" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* ШАПКА ПРОФИЛЯ */}
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
                <UserAvatar 
                    avatarUrl={profileData?.avatar_url} 
                    size={100} 
                />
            </View>
            
            {loading ? (
                <ActivityIndicator color="#F0B90B" style={{ marginTop: 10 }} />
            ) : (
                <>
                    <Text h3 style={styles.name}>
                        {profileData?.full_name || 'Пользователь'}
                    </Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <Text style={styles.city}>{profileData?.city || 'Город не указан'}</Text>
                </>
            )}
        </View>

        {/* МЕНЮ */}
        <View style={styles.menuContainer}>
            <Text style={styles.sectionTitle}>АККАУНТ</Text>
            
            <MenuItem 
                icon="settings" 
                title="Настройки" 
                color="#F0B90B" 
                onPress={() => router.push('/settings')} 
            />
            
            <MenuItem 
                icon="credit-card" 
                title="Мои карты" 
                color="#848E9C" 
                onPress={() => Alert.alert('В разработке', 'Функция оплаты скоро появится!')} 
            />
            
            <MenuItem 
                icon="bell" 
                title="Уведомления" 
                onPress={() => router.push('/notifications')} 
            />

            <Text style={styles.sectionTitle}>ПРИЛОЖЕНИЕ</Text>
            
            <MenuItem 
                icon="info" 
                title="О сервисе" 
                onPress={() => router.push('/credits')} 
            />
            
            {/* 👇 ОБНОВЛЕННАЯ КНОПКА ПОДДЕРЖКИ 👇 */}
            <MenuItem 
                icon="life-buoy"
                title="Поддержка (AI)" 
                color="#F0B90B"
                onPress={() => router.push('/(client)/ai-search')} 
            />

            <View style={{ marginTop: 20 }}>
                <MenuItem 
                    icon="log-out" 
                    title="Выйти из аккаунта" 
                    isDestructive 
                    onPress={handleLogout}
                />
            </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: 30 },
  avatarContainer: { 
      borderWidth: 2, 
      borderColor: '#F0B90B', 
      borderRadius: 55, 
      padding: 4, 
      marginBottom: 15 
  },
  name: { color: '#FAFAFA', fontWeight: '900', fontSize: 22 },
  email: { color: '#848E9C', marginTop: 5, fontSize: 14 },
  city: { color: '#F0B90B', marginTop: 5, fontSize: 12, fontWeight: '700' },
  
  menuContainer: { paddingHorizontal: 20 },
  sectionTitle: { color: '#5E6673', fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: 20, paddingLeft: 10, letterSpacing: 1 },
  
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1E2329',
      marginBottom: 10,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#2B3139'
  },
  iconBox: {
      width: 38, height: 38,
      borderRadius: 10,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 15
  },
  menuText: { flex: 1, color: '#FAFAFA', fontSize: 16, fontWeight: '600' }
});