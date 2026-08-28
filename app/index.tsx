import { Button, Icon } from '@rneui/themed';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { resolveHomeRoute } from '../lib/auth-routing';
import { useAuth } from '../providers/AuthProvider';
import { signOutSecurely } from '../lib/auth-actions';

export default function Index() {
  const { session, isLoading, isAuthorizationLoading, role, isBanned } = useAuth();
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
    if (!session?.user) return;

    setStatus('Синхронизация профиля...');

    try {
      if (isBanned) {
        setStatus('Аккаунт заблокирован');
        return;
      }
      if (!role) {
        router.replace('/(auth)/role-select');
        return;
      }
      router.replace(resolveHomeRoute(role));
    } catch (error) {
      console.error('Root auth routing error:', error);
      router.replace('/(auth)/role-select');
    }
  }, [isBanned, role, router, session?.user]);

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      setTimeout(() => router.replace('/onboarding'), 100);
      return;
    }

    // Права грузятся отдельным запросом: пока он не завершился, роль пуста и у
    // того, кто её давно выбрал. Уйти на выбор роли в этот момент — значит
    // упереться в `role_already_selected`, потому что set_initial_role меняет
    // только роль, которая ещё не задана.
    if (isAuthorizationLoading) {
      setStatus('Синхронизация профиля...');
      return;
    }

    checkRole();
  }, [checkRole, isAuthorizationLoading, isLoading, router, session]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0B0E11',
        padding: 20,
      }}
    >
      <StatusBar style="light" />

      <Icon name="zap" type="feather" size={80} color="#F0B90B" />
      <View style={{ height: 30 }} />

      {isLoading ? (
        <ActivityIndicator size="large" color="#F0B90B" />
      ) : (
        <Icon name="check-circle" type="feather" size={40} color="#F0B90B" />
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
              await signOutSecurely();
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
