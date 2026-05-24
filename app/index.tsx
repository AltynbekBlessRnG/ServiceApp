import { Button, Icon } from '@rneui/themed';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { resolveHomeRoute } from '../lib/auth-routing';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export default function Index() {
  const { session, isLoading, user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('Инициализация...');
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowReset(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const checkRole = useCallback(async () => {
    if (!user) return;

    setStatus('Синхронизация профиля...');

    try {
      if (user.user_metadata?.role) {
        router.replace(resolveHomeRoute(user.user_metadata.role));
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, city')
        .eq('id', user.id)
        .single();

      if (error || !profile?.role) {
        router.replace('/(auth)/role-select');
        return;
      }

      await supabase.auth.updateUser({ data: { role: profile.role, city: profile.city } });
      router.replace(resolveHomeRoute(profile.role));
    } catch (error) {
      console.error('Root auth routing error:', error);
      router.replace('/(auth)/role-select');
    }
  }, [router, user]);

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      setTimeout(() => router.replace('/onboarding'), 100);
      return;
    }

    checkRole();
  }, [checkRole, isLoading, router, session]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F0C15',
        padding: 20,
      }}
    >
      <StatusBar style="light" />

      <Icon name="zap" type="feather" size={80} color="#8A2BE2" />
      <View style={{ height: 30 }} />

      {isLoading ? (
        <ActivityIndicator size="large" color="#00FFCC" />
      ) : (
        <Icon name="check-circle" type="feather" size={40} color="#00FFCC" />
      )}

      <Text
        style={{
          marginTop: 20,
          color: '#A09BAF',
          fontWeight: '600',
          fontSize: 14,
          letterSpacing: 1,
        }}
      >
        {status.toUpperCase()}
      </Text>

      {showReset && (
        <View style={{ marginTop: 60, width: '100%', alignItems: 'center', opacity: 0.8 }}>
          <Text style={{ color: '#FF4757', marginBottom: 10, fontSize: 12 }}>Долго грузится?</Text>
          <Button
            title="Сбросить и войти заново"
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/onboarding');
            }}
            buttonStyle={{
              backgroundColor: 'transparent',
              borderColor: '#FF4757',
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 20,
              height: 45,
            }}
            titleStyle={{ color: '#FF4757', fontWeight: 'bold', fontSize: 14 }}
          />
        </View>
      )}
    </View>
  );
}
