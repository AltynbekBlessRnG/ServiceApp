import { Button, Input, Text, useTheme } from '@rneui/themed';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { showToast } from '../../components/AppToast';
import { getAuthErrorMessage, normalizeEmail } from '../../lib/auth-validation';
import { describeCaptchaRejection } from '../../lib/captcha';
import { useCaptcha } from '../../hooks/useCaptcha';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha('recovery', 'normal');

  const submit = async (captchaToken?: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return Alert.alert('Ошибка', 'Введите email');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: Linking.createURL('auth/callback', { queryParams: { type: 'recovery' } }),
      captchaToken,
    });
    setLoading(false);
    if (error) return Alert.alert('Ошибка', describeCaptchaRejection(error.message) ?? getAuthErrorMessage(error.message));
    Alert.alert('Письмо отправлено', 'Откройте ссылку из письма, чтобы задать новый пароль.', [
      { text: 'Хорошо', onPress: () => router.back() },
    ]);
  };

  const beginSubmit = async () => {
    if (loading) return;
    if (!normalizeEmail(email)) return Alert.alert('Ошибка', 'Введите email');
    setLoading(true);
    const result = await captcha.requestToken();
    if (!result.ok) {
      setLoading(false);
      if (result.reason !== 'cancelled') {
        showToast({ type: 'error', title: 'Не удалось проверить защиту', message: result.message });
      }
      return;
    }
    await submit(result.token);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text h3 style={styles.title}>Восстановление пароля</Text>
        <Text style={styles.description}>Мы отправим защищённую ссылку на вашу почту.</Text>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title="Отправить ссылку" loading={loading} disabled={loading} onPress={() => void beginSubmit()} />
        <Button title="Назад" type="clear" onPress={() => router.back()} containerStyle={{ marginTop: 12 }} />
      </View>
      {captcha.element}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { padding: 20 },
  title: { color: '#FAFAFA', fontWeight: '900', textAlign: 'center' },
  description: { color: '#848E9C', textAlign: 'center', marginTop: 8, marginBottom: 24 },
});
