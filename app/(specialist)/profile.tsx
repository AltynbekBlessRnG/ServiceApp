import { Icon, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function SpecialistProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<any>(null);
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
            setProfile(data);
          }
        } catch (e) {
            // ignore
        } finally {
            if (isActive) setLoading(false);
        }
      }

      fetchProfile();

      return () => { isActive = false; };
    }, [user])
  );

  const handleLogout = () => {
      Alert.alert("Выход", "Выйти из аккаунта?", [
          { text: "Отмена", style: "cancel" },
          { text: "Выйти", style: "destructive", onPress: async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
          }}
      ]);
  }

  const menuItems = [
    // 👇 ИСПРАВЛЕННЫЕ ИКОНКИ (Feather)
    { title: 'Моя Анкета', icon: 'edit', route: '/(specialist)/edit-profile', active: true },
    { title: 'Портфолио', icon: 'image', route: '/(specialist)/portfolio' },
    { title: 'Настройки', icon: 'settings', route: '/settings' },
    { title: 'Поддержка', icon: 'life-buoy', route: '/(client)/ai-search' },
    { title: 'О приложении', icon: 'info', route: '/credits' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Логотип */}
        <View style={styles.brandingContainer}>
            <View style={styles.brandingBox}>
                 <Text style={styles.brandingText}>Taptym</Text>
            </View>
            <Text style={{color: '#6B6675', fontSize: 10, marginTop: 5}}>Для специалистов</Text>
        </View>

        {/* Аватарка и Инфо */}
        <View style={styles.userSection}>
             <View style={styles.avatarBorder}>
                <UserAvatar avatarUrl={profile?.avatar_url} size={80} />
             </View>
             
             <View style={{marginLeft: 15, flex: 1}}>
                {loading ? (
                    <ActivityIndicator size="small" color="#F0B90B" />
                ) : (
                    <>
                        <Text style={styles.userName}>
                            {profile?.full_name || 'Мастер'}
                        </Text>
                        
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                            <Icon name="map-pin" type="feather" size={12} color="#A09BAF" style={{marginRight: 4}} />
                            <Text style={styles.userCity}>
                                {profile?.city && profile.city !== 'null' ? profile.city : 'Город не указан'}
                            </Text>
                        </View>

                        <Text style={{color: '#F0B90B', fontSize: 12, fontWeight: 'bold', marginTop: 4}}>
                            • Онлайн
                        </Text>
                    </>
                )}
             </View>
        </View>

        {/* Меню */}
        <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
                <TouchableOpacity 
                    key={i} 
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.8}
                    style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden' }}
                >
                    {item.active ? (
                        // Градиентная кнопка
                        <LinearGradient
                            colors={['#F0B90B', '#F0B90B']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.menuItemGradient}
                        >
                            {/* ТУТ ВАЖНО: type="feather" */}
                            <Icon name={item.icon} type="feather" color="#fff" size={22} style={styles.icon} />
                            <Text style={[styles.menuTitle, { color: '#fff', fontWeight: 'bold' }]}>{item.title}</Text>
                            <Icon name="chevron-right" type="feather" color="#fff" size={20} />
                        </LinearGradient>
                    ) : (
                        // Обычные кнопки
                        <View style={styles.menuItemPlain}>
                            <Icon name={item.icon} type="feather" color="#fff" size={22} style={styles.icon} />
                            <Text style={[styles.menuTitle, { color: '#fff' }]}>{item.title}</Text>
                            <Icon name="chevron-right" type="feather" color="#2B3139" size={20} />
                        </View>
                    )}
                </TouchableOpacity>
            ))}

            {/* Кнопка Выхода */}
            <TouchableOpacity onPress={handleLogout} style={[styles.menuItemPlain, { marginTop: 10, borderColor: '#FF4757' }]}>
                <Icon name="log-out" type="feather" color="#FF4757" size={22} style={styles.icon} />
                <Text style={[styles.menuTitle, { color: '#FF4757', fontWeight: 'bold' }]}>Выйти</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  brandingContainer: { alignItems: 'center', marginVertical: 30 },
  brandingBox: { 
      backgroundColor: '#1E2329', 
      paddingHorizontal: 30, 
      paddingVertical: 10, 
      borderRadius: 30, 
      borderWidth: 1, 
      borderColor: '#2B3139' 
  },
  brandingText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  
  userSection: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginHorizontal: 20, 
      padding: 20, 
      backgroundColor: '#1E2329', 
      borderRadius: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#2B3139'
  },
  avatarBorder: { borderWidth: 2, borderColor: '#F0B90B', borderRadius: 45, padding: 3 },
  userName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  userCity: { color: '#A09BAF', fontSize: 14 },

  menuCard: { marginHorizontal: 20 },
  
  menuItemGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  menuItemPlain: { 
      flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20,
      backgroundColor: '#1E2329', borderRadius: 16, borderWidth: 1, borderColor: '#2B3139'
  },
  
  icon: { marginRight: 15 },
  menuTitle: { flex: 1, fontSize: 16 },
});