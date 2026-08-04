import { Button, Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { getAuthErrorMessage } from '../../lib/auth-validation';

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) {
      Alert.alert('Ошибка', getAuthErrorMessage(error.message));
      return;
    }
    setCooldown(60);
    Alert.alert('Письмо отправлено', 'Проверьте входящие и папку «Спам».');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Icon name="mail" type="feather" size={64} color="#F0B90B" />
      <Text h3 style={styles.title}>Подтвердите email</Text>
      <Text style={styles.description}>
        Ссылка подтверждения отправлена на {email || 'вашу почту'}. После подтверждения вернитесь в приложение.
      </Text>
      <Button
        title={cooldown > 0 ? `Отправить повторно через ${cooldown} сек.` : 'Отправить повторно'}
        type="outline"
        loading={loading}
        disabled={!email || loading || cooldown > 0}
        onPress={resend}
      />
      <Button title="Перейти ко входу" type="clear" onPress={() => router.replace('/(auth)/login')} containerStyle={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { color: '#FAFAFA', fontWeight: '900', marginTop: 20 },
  description: { color: '#848E9C', textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 28 },
});
