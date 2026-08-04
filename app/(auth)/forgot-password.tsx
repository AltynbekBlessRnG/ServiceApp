import { Button, Input, Text, useTheme } from '@rneui/themed';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { getAuthErrorMessage, normalizeEmail } from '../../lib/auth-validation';
import { getCaptchaSiteKey } from '../../lib/captcha';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef<ConfirmHcaptcha>(null);
  const captchaSiteKey = getCaptchaSiteKey();

  const submit = async (captchaToken?: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return Alert.alert('Ошибка', 'Введите email');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: Linking.createURL('auth/callback', { queryParams: { type: 'recovery' } }),
      captchaToken,
    });
    setLoading(false);
    if (error) return Alert.alert('Ошибка', getAuthErrorMessage(error.message));
    Alert.alert('Письмо отправлено', 'Откройте ссылку из письма, чтобы задать новый пароль.', [
      { text: 'Хорошо', onPress: () => router.back() },
    ]);
  };

  const beginSubmit = () => {
    if (captchaSiteKey) {
      captchaRef.current?.show();
      return;
    }
    void submit();
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
        <Button title="Отправить ссылку" loading={loading} disabled={loading} onPress={beginSubmit} />
        <Button title="Назад" type="clear" onPress={() => router.back()} containerStyle={{ marginTop: 12 }} />
      </View>
      {captchaSiteKey ? (
        <ConfirmHcaptcha
          ref={captchaRef}
          siteKey={captchaSiteKey}
          size="normal"
          baseUrl="https://hcaptcha.com"
          languageCode="ru"
          onMessage={(event) => {
            const result = event?.nativeEvent?.data;
            if (event.success && result) {
              captchaRef.current?.hide();
              void submit(result).finally(() => event.markUsed?.());
            } else if (result === 'challenge-closed') {
              captchaRef.current?.hide();
            }
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { padding: 20 },
  title: { color: '#FAFAFA', fontWeight: '900', textAlign: 'center' },
  description: { color: '#848E9C', textAlign: 'center', marginTop: 8, marginBottom: 24 },
});
