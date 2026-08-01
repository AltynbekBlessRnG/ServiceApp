import { Button, Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    Alert.alert(error ? 'Ошибка' : 'Письмо отправлено', error?.message || 'Проверьте входящие и папку «Спам».');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Icon name="mail" type="feather" size={64} color="#F0B90B" />
      <Text h3 style={styles.title}>Подтвердите email</Text>
      <Text style={styles.description}>
        Ссылка подтверждения отправлена на {email || 'вашу почту'}. После подтверждения вернитесь в приложение.
      </Text>
      <Button title="Отправить повторно" type="outline" loading={loading} disabled={!email || loading} onPress={resend} />
      <Button title="Перейти ко входу" type="clear" onPress={() => router.replace('/(auth)/login')} containerStyle={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { color: '#FAFAFA', fontWeight: '900', marginTop: 20 },
  description: { color: '#848E9C', textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 28 },
});
